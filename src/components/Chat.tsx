import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User } from '../types/user';
import { Message } from '../types/chat';
import { chatService } from '../services/chatService';
import { callService } from '../services/callService';
import { signalingService } from '../services/signalingService';
import { CallModal } from './CallModal';

interface ChatProps {
  selectedUser: User | null;
  currentUser: User | null;
  onStartCall?: () => void;
  onStartVideoCall?: () => void;
  onSendMessage: (content: string) => Promise<void>;
}

const getTimeString = (date: Date) => {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } else if (days === 1) {
    return 'Yesterday';
  } else if (days < 7) {
    return date.toLocaleDateString([], { weekday: 'long' });
  } else {
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }
};

export const Chat: React.FC<ChatProps> = ({
  selectedUser,
  currentUser,
  onStartCall,
  onStartVideoCall,
  onSendMessage,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const [showCallOptions, setShowCallOptions] = useState(false);
  const [isAttachmentMenuOpen, setIsAttachmentMenuOpen] = useState(false);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [ringSound] = useState(new Audio('/src/assets/sounds/ring.mp3'));
  
  // Call-related state
  const [isInCall, setIsInCall] = useState(false);
  const [isVideoCall, setIsVideoCall] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [showIncomingCall, setShowIncomingCall] = useState(false);
  const [incomingCallData, setIncomingCallData] = useState<{
    userId: string;
    offer: RTCSessionDescriptionInit;
    isVideo: boolean;
  } | null>(null);
  const [callerUser, setCallerUser] = useState<User | null>(null);
  
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout>();

  // Utility function to scroll to bottom
  const scrollToBottom = (immediate = false) => {
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    const scroll = () => {
      if (chatContainerRef.current) {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
      }
    };

    if (immediate) {
      scroll();
    } else {
      // Small delay to ensure content is rendered
      scrollTimeoutRef.current = setTimeout(scroll, 100);
    }
  };

  // Connect to services when component mounts
  useEffect(() => {
    if (currentUser?.id) {
      console.log("Connecting services for user:", currentUser.id);
      chatService.connect(currentUser.id);
      signalingService.connect(currentUser.id);

      return () => {
        chatService.disconnect();
        signalingService.disconnect();
      };
    }
  }, [currentUser?.id]);

  // Load chat history when selected user changes
  useEffect(() => {
    if (selectedUser && currentUser?.id) {
      chatService.getChatHistory(selectedUser.id)
        .then(history => {
          setMessages(history);
          scrollToBottom(true);
        })
        .catch(error => {
          console.error('Failed to load chat history:', error);
        });
    }
  }, [selectedUser, currentUser?.id]);

  // Listen for new messages
  useEffect(() => {
    const handleNewMessage = (message: Message) => {
      console.log('Received new message:', message);
      
      setMessages(prevMessages => {
        // Only add messages from other users
        if (message.senderId === currentUser?.id) {
          return prevMessages;
        }

        // Check if message already exists
        const messageExists = prevMessages.some(msg => msg.id === message.id);
        if (messageExists) {
          return prevMessages.map(msg => 
            msg.id === message.id ? message : msg
          );
        }

        // Add new message and sort by timestamp
        const newMessages = [...prevMessages, message];
        return newMessages.sort((a, b) => 
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
      });

      // Scroll to bottom for new messages
      scrollToBottom();
      
      // Mark message as read if it's from the selected user
      if (selectedUser && message.senderId === selectedUser.id) {
        chatService.markMessagesAsRead(message.senderId);
      }
    };

    chatService.onNewMessage(handleNewMessage);
    
    return () => {
      // Cleanup is handled by chatService
    };
  }, [selectedUser, currentUser?.id]);

  // Cleanup scroll timeout on unmount
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  const addSystemMessage = (content: string) => {
    const systemMessage: Message = {
      id: Date.now().toString(),
      senderId: 'system',
      receiverId: 'all',
      content,
      timestamp: new Date(),
      read: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      type: 'text',
      status: 'sent'
    };
    setMessages(prev => [...prev, systemMessage]);
    scrollToBottom();
  };

  // Handle call-related events
  useEffect(() => {
    const handleIncomingCall = async (data: { userId: string; offer: RTCSessionDescriptionInit; isVideo: boolean }) => {
      console.log("Incoming call from:", data.userId);
      // Play ring sound
      ringSound.loop = true;
      ringSound.play().catch(err => console.error('Error playing ring sound:', err));
      
      // Add system message
      addSystemMessage(`Incoming call from ${callerUser?.name || 'Unknown User'}`);
      
      // Set the incoming call data
      setIncomingCallData(data);
      setShowIncomingCall(true);
      setIsVideoCall(data.isVideo);
      // You would typically get the caller's user info from your user service
      // For now, we'll create a basic user object
      setCallerUser({
        id: data.userId,
        name: "Incoming Call",
        avatar: "", // Add a default avatar URL
        status: "online"
      });
    };

    const handleRemoteStream = (stream: MediaStream) => {
      console.log("Received remote stream");
      setRemoteStream(stream);
    };

    const handleCallEnded = () => {
      console.log("Call ended");
      // Stop ring sound if it's playing
      ringSound.pause();
      ringSound.currentTime = 0;
      
      // Add system message
      addSystemMessage('Call ended');
      
      setIsInCall(false);
      setLocalStream(null);
      setRemoteStream(null);
      setShowIncomingCall(false);
      setIncomingCallData(null);
      setCallerUser(null);
    };

    const handleCallRejected = () => {
      console.log("Call rejected");
      // Stop ring sound if it's playing
      ringSound.pause();
      ringSound.currentTime = 0;
      
      // Add system message
      addSystemMessage('Call was not answered');
      
      setIsInCall(false);
      setLocalStream(null);
      setShowIncomingCall(false);
      setIncomingCallData(null);
      setCallerUser(null);
    };

    // Subscribe to call events
    callService.on('incomingCall', handleIncomingCall);
    callService.on('remoteStream', handleRemoteStream);
    callService.on('callEnded', handleCallEnded);
    callService.on('callRejected', handleCallRejected);

    return () => {
      // Cleanup event listeners and sound
      ringSound.pause();
      ringSound.currentTime = 0;
      callService.off('incomingCall', handleIncomingCall);
      callService.off('remoteStream', handleRemoteStream);
      callService.off('callEnded', handleCallEnded);
      callService.off('callRejected', handleCallRejected);
    };
  }, []);

  const handleStartCall = async (isVideo: boolean) => {
    if (!selectedUser) return;

    try {
      console.log("Starting call with:", selectedUser.id);
      // Add system message
      addSystemMessage(`Calling ${selectedUser.name}...`);
      
      setIsInCall(true);
      setIsVideoCall(isVideo);
      const stream = await callService.startCall(selectedUser.id, {
        audio: true,
        video: isVideo,
      });
      setLocalStream(stream);
    } catch (error) {
      console.error('Error starting call:', error);
      // Add error system message
      addSystemMessage('Failed to start call');
      setIsInCall(false);
    }
  };

  const handleAcceptCall = async () => {
    if (!incomingCallData) return;

    try {
      console.log("Accepting call from:", incomingCallData.userId);
      // Stop ring sound
      ringSound.pause();
      ringSound.currentTime = 0;
      
      // Add system message
      addSystemMessage('Call accepted');
      
      setIsInCall(true);
      const stream = await callService.handleIncomingCall(
        incomingCallData.offer,
        incomingCallData.userId
      );
      setLocalStream(stream);
      setShowIncomingCall(false);
      setIncomingCallData(null);
    } catch (error) {
      console.error('Error accepting call:', error);
      // Add error system message
      addSystemMessage('Failed to accept call');
      setIsInCall(false);
    }
  };

  const handleRejectCall = () => {
    if (!incomingCallData) return;
    console.log("Rejecting call from:", incomingCallData.userId);
    // Stop ring sound
    ringSound.pause();
    ringSound.currentTime = 0;
    
    // Add system message
    addSystemMessage('Call rejected');
    
    callService.rejectCall(incomingCallData.userId);
    setShowIncomingCall(false);
    setIncomingCallData(null);
    setCallerUser(null);
  };

  const handleEndCall = () => {
    console.log("Ending call");
    // Add system message
    addSystemMessage('Call ended');
    
    callService.endCall();
    setIsInCall(false);
    setLocalStream(null);
    setRemoteStream(null);
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !currentUser?.id || !selectedUser?.id) return;

    const messageContent = newMessage.trim();
    const tempMessage: Message = {
      id: Date.now().toString(),
      senderId: currentUser.id,
      receiverId: selectedUser.id,
      content: messageContent,
      timestamp: new Date(),
      read: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      type: 'text',
      status: 'sending'
    };

    try {
      // Clear input immediately
      setNewMessage('');
      setIsEmojiPickerOpen(false);

      // Add temporary message to UI immediately
      setMessages(prev => [...prev, tempMessage]);
      scrollToBottom();

      // Send message through the parent component
      await onSendMessage(messageContent);

      // Update temp message status to sent
      setMessages(prev => prev.map(msg => 
        msg.id === tempMessage.id ? { ...msg, status: 'sent' } : msg
      ));
    } catch (error) {
      console.error('Failed to send message:', error);
      // Update the temporary message to show error
      setMessages(prev => prev.map(msg => 
        msg.id === tempMessage.id ? { ...msg, status: 'error' } : msg
      ));
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0 || !selectedUser) return;

    const file = files[0];
    const isImage = file.type.startsWith('image/');
    
    // Here you would typically upload the file to your server/storage
    // For demo purposes, we'll create an object URL
    const fileUrl = URL.createObjectURL(file);
    
    const content = isImage ? 'Sent an image' : `Sent a file: ${file.name}`;
    await chatService.sendMessage(selectedUser.id, content);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(false);
    handleFileUpload(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(false);
  };

  if (!selectedUser || !currentUser) return null;

  return (
    <div className="flex-1 flex flex-col bg-gray-900 h-full relative">
      {/* Sticky Chat Header */}
      <div className="h-16 px-6 flex items-center justify-between border-b border-gray-800 bg-gray-800 shadow-lg sticky top-0 z-10">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <img
              src={selectedUser.avatar || ''}
              alt={selectedUser.name}
              className="w-10 h-10 rounded-full ring-2 ring-gray-700"
            />
            <div
              className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-gray-800 ${
                selectedUser.status === 'online'
                  ? 'bg-green-500'
                  : selectedUser.status === 'busy'
                  ? 'bg-red-500'
                  : selectedUser.status === 'in-call'
                  ? 'bg-yellow-500'
                  : 'bg-gray-500'
              }`}
            />
          </div>
          <div>
            <h2 className="text-white font-semibold text-lg">{selectedUser.name}</h2>
            <p className="text-sm text-gray-400 flex items-center">
              {selectedUser.status.charAt(0).toUpperCase() + selectedUser.status.slice(1)}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={() => handleStartCall(false)}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white transition-all"
          >
            <i className="fas fa-phone" />
          </button>
          <button
            onClick={() => handleStartCall(true)}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white transition-all"
          >
            <i className="fas fa-video" />
          </button>
          <button
            className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white transition-all"
          >
            <i className="fas fa-ellipsis-v" />
          </button>
        </div>
      </div>

      {/* Scrollable Messages Area */}
      <div 
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto py-6 px-6 flex flex-col-reverse min-h-0"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="flex flex-col space-y-6">
          {messages.map((message, index) => {
            const isFirstInGroup = index === 0 || 
              messages[index - 1].senderId !== message.senderId;
            const showAvatar = isFirstInGroup && message.senderId !== 'system';
            const isSystemMessage = message.senderId === 'system';

            return (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex items-start space-x-4 ${
                  isSystemMessage 
                    ? 'justify-center' 
                    : message.senderId === currentUser.id 
                      ? 'flex-row-reverse space-x-reverse' 
                      : ''
                }`}
              >
                {showAvatar && (
                  <img
                    src={message.senderId === currentUser.id ? currentUser.avatar : selectedUser.avatar}
                    alt="Avatar"
                    className="w-10 h-10 rounded-full ring-2 ring-gray-700"
                  />
                )}
                <div className={`flex flex-col ${!showAvatar && !isSystemMessage ? 'ml-14' : ''} ${
                  isSystemMessage 
                    ? 'items-center' 
                    : message.senderId === currentUser.id 
                      ? 'items-end' 
                      : 'items-start'
                }`}>
                  {message.replyTo && !isSystemMessage && (
                    <div className={`mb-2 text-sm ${
                      message.senderId === currentUser.id ? 'text-right' : 'text-left'
                    }`}>
                      <div className="inline-block bg-gray-800 rounded-lg px-4 py-2 max-w-md">
                        <div className="text-gray-400 mb-1">
                          Replying to {message.replyTo.sender}
                        </div>
                        <div className="text-gray-300 truncate">
                          {message.replyTo.content}
                        </div>
                      </div>
                    </div>
                  )}

                  <div
                    className={`group relative max-w-md ${
                      isSystemMessage
                        ? 'bg-gray-800 text-gray-400'
                        : message.senderId === currentUser.id
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-700 text-gray-100'
                    } rounded-2xl px-4 py-2 shadow-md hover:shadow-lg transition-shadow ${
                      isSystemMessage ? 'text-sm italic' : ''
                    }`}
                  >
                    {message.type === 'text' && (
                      <p className="text-base leading-relaxed">{message.content}</p>
                    )}
                    
                    {message.type === 'file' && (
                      <div className="space-y-2">
                        <a
                          href={message.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center space-x-3 p-3 bg-gray-800 bg-opacity-50 rounded-lg hover:bg-opacity-75 transition-colors"
                        >
                          <div className="w-10 h-10 flex items-center justify-center bg-gray-700 rounded-lg">
                            <i className="fas fa-file-alt text-xl" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">
                              {message.fileName}
                            </div>
                            <div className="text-xs opacity-80">
                              Click to download
                            </div>
                          </div>
                          <i className="fas fa-download" />
                        </a>
                      </div>
                    )}

                    {!isSystemMessage && message.senderId === currentUser.id && (
                      <div className="absolute -right-6 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {message.status === 'sending' && (
                          <i className="fas fa-circle-notch fa-spin text-gray-500 text-xs" />
                        )}
                        {message.status === 'sent' && (
                          <i className="fas fa-check text-gray-500 text-xs" />
                        )}
                        {message.status === 'delivered' && (
                          <i className="fas fa-check-double text-gray-500 text-xs" />
                        )}
                        {message.status === 'read' && (
                          <i className="fas fa-check-double text-blue-500 text-xs" />
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
        
        {isDraggingFile && (
          <div className="absolute inset-0 bg-gray-900 bg-opacity-90 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-gray-800 p-8 rounded-2xl shadow-2xl text-center">
              <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-cloud-upload-alt text-3xl text-blue-500" />
              </div>
              <h3 className="text-white text-lg font-semibold mb-2">Drop your files here</h3>
              <p className="text-gray-400 text-sm">Your files will be uploaded instantly</p>
            </div>
          </div>
        )}
      </div>

      {/* Fixed Chat Input */}
      <div className="w-full bg-gray-800 border-t border-gray-700 sticky bottom-0 z-10">
        {replyingTo && (
          <div className="px-6 pt-4 flex items-center justify-between bg-gray-800">
            <div className="flex items-center space-x-3">
              <div className="w-1 h-8 bg-blue-500 rounded-full" />
              <div>
                <div className="text-sm text-gray-300">
                  Replying to {replyingTo.senderId === currentUser.id ? 'yourself' : selectedUser.name}
                </div>
                <div className="text-gray-400 text-sm truncate">
                  {replyingTo.content}
                </div>
              </div>
            </div>
            <button
              onClick={() => setReplyingTo(null)}
              className="text-gray-400 hover:text-white p-2"
            >
              <i className="fas fa-times" />
            </button>
          </div>
        )}

        <div className="p-6 flex items-center space-x-3">
          <div className="relative">
            <button
              onClick={() => setIsAttachmentMenuOpen(!isAttachmentMenuOpen)}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white transition-all"
            >
              <i className="fas fa-plus" />
            </button>
            
            <AnimatePresence>
              {isAttachmentMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute bottom-full left-0 mb-2 w-56 py-2 bg-gray-700 rounded-xl shadow-xl border border-gray-600"
                >
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full px-4 py-2 text-left text-gray-300 hover:bg-gray-600 flex items-center space-x-3"
                  >
                    <i className="fas fa-file text-gray-400" />
                    <span>Upload File</span>
                  </button>
                  <button
                    onClick={() => {
                      if (fileInputRef.current) {
                        fileInputRef.current.accept = 'image/*';
                        fileInputRef.current.click();
                      }
                    }}
                    className="w-full px-4 py-2 text-left text-gray-300 hover:bg-gray-600 flex items-center space-x-3"
                  >
                    <i className="fas fa-image text-gray-400" />
                    <span>Upload Image</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            onChange={(e) => handleFileUpload(e.target.files)}
          />
          
          <div className="flex-1 relative">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={`Message ${selectedUser.name}...`}
              className="w-full bg-gray-700 text-gray-100 placeholder-gray-400 rounded-full px-6 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            
            <button
              onClick={() => setIsEmojiPickerOpen(!isEmojiPickerOpen)}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 !bg-transparent text-gray-400 hover:text-gray-300"
            >
              <i className="far fa-smile text-xl" />
            </button>
            
            <AnimatePresence>
              {isEmojiPickerOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute bottom-full right-0 mb-2"
                >
                  <div className="w-72 h-96 bg-gray-700 rounded-xl shadow-xl border border-gray-600 p-4">
                    <div className="text-center text-gray-400">
                      <p>Emoji Picker</p>
                      <p className="text-xs">(Implementation required)</p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          <button
            onClick={handleSendMessage}
            disabled={!newMessage.trim()}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-blue-600 hover:bg-blue-500 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-600"
          >
            <i className="fas fa-paper-plane" />
          </button>
        </div>
      </div>

      {/* Incoming Call Notification */}
      <AnimatePresence>
        {showIncomingCall && incomingCallData && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-4 right-4 bg-gray-800 rounded-lg shadow-lg p-4 z-50"
          >
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center">
                <i className={`fas ${isVideoCall ? 'fa-video' : 'fa-phone'} text-white text-xl`} />
              </div>
              <div>
                <h3 className="text-white font-semibold">
                  Incoming {isVideoCall ? 'Video' : 'Audio'} Call
                </h3>
                <p className="text-gray-400 text-sm">
                  {callerUser?.name || 'Unknown Caller'}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleAcceptCall}
                  className="w-10 h-10 rounded-full bg-green-500 hover:bg-green-600 text-white flex items-center justify-center"
                >
                  <i className="fas fa-phone" />
                </button>
                <button
                  onClick={handleRejectCall}
                  className="w-10 h-10 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center"
                >
                  <i className="fas fa-phone-slash" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Call Modal */}
      <CallModal
        isOpen={isInCall}
        onClose={handleEndCall}
        localStream={localStream}
        remoteStream={remoteStream}
        isVideo={isVideoCall}
        selectedUser={selectedUser}
        onEndCall={handleEndCall}
      />
    </div>
  );
}; 
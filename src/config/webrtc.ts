export const WEBRTC_CONFIG: RTCConfiguration = {
  iceServers: [
    // Google's public STUN servers
    { urls: [
      'stun:stun1.l.google.com:19302',
      'stun:stun2.l.google.com:19302',
      'stun:stun3.l.google.com:19302',
      'stun:stun4.l.google.com:19302'
    ]},
    // Backup STUN servers
    { urls: [
      'stun:stun.stunprotocol.org:3478',
      'stun:stun.voip.blackberry.com:3478'
    ]},
    // TURN servers with both UDP and TCP fallback
    {
      urls: [
        'turn:openrelay.metered.ca:443',
        'turn:openrelay.metered.ca:443?transport=tcp',
        'turns:openrelay.metered.ca:443'
      ],
      username: 'openrelayproject',
      credential: 'openrelayproject'
    },
    // Backup TURN servers
    {
      urls: [
        'turn:relay.metered.ca:443',
        'turn:relay.metered.ca:443?transport=tcp'
      ],
      username: 'openrelayproject',
      credential: 'openrelayproject'
    }
  ],
  iceTransportPolicy: 'all',
  bundlePolicy: 'max-bundle' as RTCBundlePolicy,
  rtcpMuxPolicy: 'require' as RTCRtcpMuxPolicy,
  iceCandidatePoolSize: 2
};

// Recommended production configuration - uncomment and replace with your TURN server details
/*
export const PRODUCTION_WEBRTC_CONFIG = {
  ...WEBRTC_CONFIG,
  iceServers: [
    { urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'] },
    {
      urls: [
        'turn:your-turn-server.com:443',
        'turn:your-turn-server.com:443?transport=tcp'
      ],
      username: 'your-username',
      credential: 'your-credential'
    }
  ]
};
*/ 
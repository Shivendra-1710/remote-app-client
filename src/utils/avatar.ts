export const getDefaultAvatar = (name: string) => {
  return `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(name)}&backgroundColor=2c2f33`;
}; 
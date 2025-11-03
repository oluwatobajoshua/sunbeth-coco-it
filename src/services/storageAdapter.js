// Storage adapter to support environments without Firebase Storage or any server
// Modes:
// - inline (default): compress to data URL and return it; persisted inside Firestore doc
// - local (alias of inline): same as inline to avoid any server requirement

export async function uploadIssuePhoto(issueId, file, index = 0) {
  const mode = (process.env.REACT_APP_STORAGE_MODE || 'inline').toLowerCase();
  // Both 'inline' and 'local' follow the same path to avoid any extra servers
  if (mode === 'inline' || mode === 'local') {
    const dataUrl = await fileToDataURL(file, 0.6); // compress moderately
    return { url: dataUrl, kind: 'data-url' };
  }
  // Future: support other adapters (e.g., cloudinary unsigned) without custom servers
  const dataUrl = await fileToDataURL(file, 0.6);
  return { url: dataUrl, kind: 'data-url' };
}

function fileToDataURL(file, quality = 0.8, maxSize = 1280) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      // Optional: downscale via canvas to control size
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        if (Math.max(width, height) > maxSize) {
          if (width > height) {
            height = Math.round((height * maxSize) / width); width = maxSize;
          } else {
            width = Math.round((width * maxSize) / height); height = maxSize;
          }
        }
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

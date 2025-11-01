import React from 'react';
import { useDropzone } from 'react-dropzone';
import { toast } from 'react-hot-toast';

const PhotoUpload = ({ photos, onChange }) => {
  const onDrop = (acceptedFiles) => {
    if (photos.length + acceptedFiles.length > 3) {
      toast.error('Maximum 3 photos allowed');
      return;
    }

    const newPhotos = acceptedFiles.map(file => {
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`File ${file.name} is too large. Maximum size is 5MB.`);
        return null;
      }

      return {
        file,
        url: URL.createObjectURL(file),
        id: Date.now() + Math.random()
      };
    }).filter(Boolean);

    onChange([...photos, ...newPhotos]);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif']
    },
    multiple: true
  });

  const removePhoto = (photoId) => {
    const updatedPhotos = photos.filter(photo => photo.id !== photoId);
    onChange(updatedPhotos);
  };

  return (
    <div className="form-group">
      <label>
        <i className="fas fa-camera"></i>
        Add Photos (Optional)
      </label>
      
      <div
        {...getRootProps()}
        className={`photo-upload-area ${isDragActive ? 'drag-active' : ''}`}
      >
        <input {...getInputProps()} />
        <div className="upload-prompt">
          <i className="fas fa-cloud-upload-alt"></i>
          <p>
            {isDragActive
              ? 'Drop photos here'
              : 'Drag photos here or click to select'
            }
          </p>
          <small>Up to 3 photos, max 5MB each</small>
        </div>
      </div>

      {photos.length > 0 && (
        <div className="photo-preview">
          {photos.map(photo => (
            <div key={photo.id} className="photo-item">
              <img src={photo.url} alt="Issue" />
              <button
                type="button"
                className="photo-remove"
                onClick={() => removePhoto(photo.id)}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PhotoUpload;
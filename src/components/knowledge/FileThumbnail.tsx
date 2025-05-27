
import React, { useState, useEffect } from 'react';
import { File, FileText, Image as ImageIcon, FileCode } from "lucide-react";

interface FileThumbnailProps {
  file?: File;
  fileType?: string;
  thumbnailUrl?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const FileThumbnail: React.FC<FileThumbnailProps> = ({ 
  file, 
  fileType, 
  thumbnailUrl, 
  className = '',
  size = 'md'
}) => {
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState(false);

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16'
  };

  const iconSizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8'
  };

  useEffect(() => {
    if (file && file.type.startsWith('image/')) {
      const objectUrl = URL.createObjectURL(file);
      setPreview(objectUrl);

      return () => URL.revokeObjectURL(objectUrl);
    } else if (thumbnailUrl) {
      setPreview(thumbnailUrl);
    }
  }, [file, thumbnailUrl]);

  const getFileIcon = () => {
    const type = fileType || file?.type || '';
    const iconClass = `${iconSizeClasses[size]} text-muted-foreground`;

    if (type.includes('pdf')) {
      return <File className={`${iconClass} text-red-500`} />;
    } else if (type.includes('image')) {
      return <ImageIcon className={`${iconClass} text-blue-500`} />;
    } else if (type.includes('text') || type.includes('markdown')) {
      return <FileText className={`${iconClass} text-gray-500`} />;
    } else if (type.includes('csv')) {
      return <FileCode className={`${iconClass} text-green-500`} />;
    } else {
      return <File className={iconClass} />;
    }
  };

  if (preview && !error) {
    return (
      <div className={`${sizeClasses[size]} ${className} rounded border overflow-hidden bg-muted flex items-center justify-center`}>
        <img 
          src={preview} 
          alt="File preview" 
          className="w-full h-full object-cover"
          onError={() => setError(true)}
        />
      </div>
    );
  }

  return (
    <div className={`${sizeClasses[size]} ${className} rounded border bg-muted flex items-center justify-center`}>
      {getFileIcon()}
    </div>
  );
};

export default FileThumbnail;

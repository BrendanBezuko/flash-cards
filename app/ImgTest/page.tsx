"use client";

import { useEffect, useState } from "react";
import { initDB, storeImage, getImage, listAllImages } from "@/utils/db";
import { IDBPDatabase } from "idb";

export default function TestDB() {
  const [db, setDb] = useState<IDBPDatabase | null>(null);
  const [images, setImages] = useState<any[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    const initialize = async () => {
      const database = await initDB();
      if (database) {
        setDb(database);
        // Load existing images
        const allImages = await listAllImages(database);
        setImages(allImages);
      }
    };
    initialize();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!db || !e.target.files?.[0]) return;

    const file = e.target.files[0];
    const imageId = await storeImage(db, file);

    if (imageId) {
      // Refresh the list of images
      const allImages = await listAllImages(db);
      setImages(allImages);
    }
  };

  const handleViewImage = async (id: number) => {
    if (!db) return;

    try {
      const imageBlob = await getImage(db, id);
      if (imageBlob instanceof Blob) {
        // Make sure we have a valid Blob
        const imageUrl = URL.createObjectURL(imageBlob);
        setSelectedImage(imageUrl);
      } else {
        console.error("Retrieved image is not a valid Blob");
      }
    } catch (error) {
      console.error("Error viewing image:", error);
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">IndexedDB Image Test</h1>

      {/* Upload Section */}
      <div className="mb-6">
        <input
          type="file"
          accept="image/*"
          onChange={handleFileUpload}
          className="mb-4"
        />
      </div>

      {/* Images List */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Stored Images:</h2>
        <div className="space-y-2">
          {images.map((img) => (
            <div key={img.id} className="flex items-center space-x-4">
              <span>ID: {img.id}</span>
              <span>Size: {(img.size / 1024).toFixed(2)} KB</span>
              <span>Type: {img.type}</span>
              <button
                onClick={() => handleViewImage(img.id)}
                className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                View Image
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Image Preview */}
      {selectedImage && (
        <div className="mt-4">
          <h2 className="text-xl font-semibold mb-2">Preview:</h2>
          <img
            src={selectedImage}
            alt="Preview"
            className="max-w-md border"
            onLoad={() => {
              // Clean up the object URL after the image loads
              URL.revokeObjectURL(selectedImage);
            }}
          />
        </div>
      )}
    </div>
  );
}

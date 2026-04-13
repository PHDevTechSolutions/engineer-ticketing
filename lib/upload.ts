export const uploadToCloudinary = async (file: File) => {
  const formData = new FormData();
  formData.append("file", file);
  // Replace 'your_preset' with your Cloudinary Unsigned Upload Preset
  formData.append("upload_preset", "engiconnect_uploads"); 

  // Determine resource type: 'raw' for PDFs, 'image' for images
  const isPDF = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  const resourceType = isPDF ? 'raw' : 'image';

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/your_cloud_name/${resourceType}/upload`,
    { method: "POST", body: formData }
  );

  const data = await response.json();
  return data.secure_url; // This is the link we save to Firebase
};
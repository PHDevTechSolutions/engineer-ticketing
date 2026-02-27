export const uploadToCloudinary = async (file: File) => {
  const formData = new FormData();
  formData.append("file", file);
  // Replace 'your_preset' with your Cloudinary Unsigned Upload Preset
  formData.append("upload_preset", "engiconnect_uploads"); 

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/your_cloud_name/image/upload`,
    { method: "POST", body: formData }
  );

  const data = await response.json();
  return data.secure_url; // This is the link we save to Firebase
};
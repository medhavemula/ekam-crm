export interface PresignedUrlParams {
  files: { fileName: string; contentType: string; fileSize: number }[];
}

export interface PresignedUrlResponse {
  success: boolean;
  data: {
    files: {
      uploadUrl: string;
      url: string;
      key: string;
      fileName: string;
      expiresIn: number;
    }[];
  };
}

export interface UploadedFile {
  key: string;
  url: string;
  type: "image" | "video";
}

export async function uploadFiles(
  files: File[],
  getPresignedUrls: (params: PresignedUrlParams) => Promise<PresignedUrlResponse>
): Promise<UploadedFile[]> {
  const fileParams = files.map((file) => ({
    fileName: file.name,
    contentType: file.type,
    fileSize: file.size,
  }));

  const presignResponse = await getPresignedUrls({ files: fileParams });

  if (!presignResponse.success || !presignResponse.data?.files) {
    throw new Error("Failed to get presigned URLs");
  }

  const uploadPromises = presignResponse.data.files.map(async (urlData, index) => {
    const file = files[index];
    const response = await fetch(urlData.uploadUrl, {
      method: "PUT",
      body: file,
      headers: {
        "Content-Type": file.type,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to upload file: ${file.name}`);
    }

    // Determine type based on content type
    const type: "image" | "video" = file.type.startsWith("video/") ? "video" : "image";

    return {
      key: urlData.key,
      url: urlData.url,
      type,
    };
  });

  return Promise.all(uploadPromises);
}

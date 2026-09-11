import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import PageHeader from "../../components/common/PageHeader";
import FormInput from "../../components/forms/FormInput";
import FormSelect from "../../components/forms/FormSelect";
import FormTextarea from "../../components/forms/FormTextarea";
import GradientContainer from "../../components/common/GradientContainer";
import { useGetGroupQuery, useUpdateGroupMutation, useGetPresignCoverUrlMutation } from "../../services/groupsApi";
import { formatStepwiseDescription } from "../../utils/descriptionFormatter";

const EditGroupPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [updateGroup, { isLoading }] = useUpdateGroupMutation();
  const [getPresignCoverUrl] = useGetPresignCoverUrlMutation();
  const { data: groupData, isLoading: isGroupLoading } = useGetGroupQuery(id!);

  const placeholderImageUrl = "https://ekam-develop.s3.ap-south-2.amazonaws.com/groups/covers/1766053856092-25319d424ba5bbbf.jpg?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=AKIAZNHPYAP6I4UCEGH3%2F20251218%2Fap-south-2%2Fs3%2Faws4_request&X-Amz-Date=20251218T103522Z&X-Amz-Expires=900&X-Amz-Signature=6bfab2e89ca1691bfa92b979e14edc3c43bf35e1b05fe44b2d864dd29867c99f&X-Amz-SignedHeaders=host&x-amz-checksum-mode=ENABLED&x-id=GetObject";

  const [formData, setFormData] = useState({
    groupName: "",
    groupPrivacy: "",
    category: "",
    otherCategory: "",
    location: "",
    description: "",
    groupPhoto: null as File | null,
    currentPhotoUrl: "",
    photoPreview: "" as string | null
  });

const privacyOptions = [
    { value: "", label: "Select Privacy" },
    { value: "public", label: "Public" },
    { value: "private", label: "Private" }
  ];

  const categoryOptions = [
    { value: "", label: "Select category" },
    { value: "business", label: "Business" },
    { value: "technology", label: "Technology" },
    { value: "design", label: "Design" },
    { value: "marketing", label: "Marketing" },
    { value: "education", label: "Education" },
    { value: "health", label: "Health" },
    { value: "other", label: "Other" }
  ];

  const [errors, setErrors] = useState({
    groupName: "",
    groupPrivacy: "",
    otherCategory: "",
    groupPhoto: ""
  });


  useEffect(() => {
    if (groupData?.data) {
      const group = groupData.data;
      const formDataValues = {
        groupName: group.name || "",
        groupPrivacy: group.privacy === "PUBLIC" ? "public" : "private",
        category: group.category && !categoryOptions.find(opt => opt.value === group.category) ? "other" : (group.category || ""),
        otherCategory: group.category && !categoryOptions.find(opt => opt.value === group.category) ? group.category : "",
        location: group.location || "",
        description: formatStepwiseDescription(group.description) || "",
        groupPhoto: null,
        currentPhotoUrl: group.coverImageUrl || placeholderImageUrl,
        photoPreview: null
      };
      setFormData(formDataValues);
    }
  }, [groupData]);

  const handleInputChange = (field: string, value: any) => {
    // Handle React ChangeEvent object
    if (value && typeof value === 'object' && 'target' in value) {
      value = (value as React.ChangeEvent<HTMLInputElement>).target.value;
    }
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (field === 'otherCategory' ? errors.otherCategory : errors[field as keyof typeof errors]) {
      setErrors(prev => ({ ...prev, [field]: "" }));
    }
  };

  const validateForm = () => {
    const newErrors: {
      groupName: string;
      groupPrivacy: string;
      otherCategory: string;
      groupPhoto: string;
    } = {
      groupName: "",
      groupPrivacy: "",
      otherCategory: "",
      groupPhoto: ""
    };

    if (!formData.groupName.trim()) {
      newErrors.groupName = "Group name is required";
    }

    if (!formData.groupPrivacy) {
      newErrors.groupPrivacy = "Group privacy is required";
    }

    if (formData.category === "other" && !formData.otherCategory.trim()) {
      newErrors.otherCategory = "Please specify the category";
    }

    // Validate image if provided
    if (formData.groupPhoto) {
      const file = formData.groupPhoto;
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
      const maxSize = 1 * 1024 * 1024; // 1MB in bytes

      if (!validTypes.includes(file.type)) {
        newErrors.groupPhoto = 'Only JPG, JPEG, and PNG files are allowed';
      } else if (file.size > maxSize) {
        newErrors.groupPhoto = 'File size must be less than 1MB';
      }
    }

    setErrors(newErrors);
    return !newErrors.groupName && !newErrors.groupPrivacy && !newErrors.otherCategory;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (validateForm()) {
      try {
        let coverImageUrl = formData.currentPhotoUrl;
        let hasNewPhoto = false;

        // Upload new image if provided
        if (formData.groupPhoto) {
          const presignData = {
            fileName: formData.groupPhoto.name,
            contentType: formData.groupPhoto.type,
            fileSize: formData.groupPhoto.size,
          };

          const presignResult = await getPresignCoverUrl(presignData).unwrap();

          // Upload the image to the presigned URL
          const response = await fetch(presignResult.data.uploadUrl, {
            method: "PUT",
            headers: {
              "Content-Type": formData.groupPhoto.type,
            },
            body: formData.groupPhoto,
          });

          if (!response.ok) {
            throw new Error("Failed to upload image");
          }

          coverImageUrl = presignResult.data.url;
          hasNewPhoto = true;
        }

        // Build update data with all current values
        const updateData: any = {
          name: formData.groupName,
          description: formData.description,
          privacy: (formData.groupPrivacy === "public" ? "PUBLIC" : "PRIVATE") as "PUBLIC" | "PRIVATE",
          category: formData.category === "other" ? formData.otherCategory : formData.category,
          location: formData.location,
        };

        if (hasNewPhoto) {
          updateData.coverImageUrl = coverImageUrl;
        }

        await updateGroup({ id: id!, data: updateData }).unwrap();
        navigate(`/groups/${id}`);
      } catch (error) {
        console.error("Failed to update group:", error);
        // navigate is NOT called here, so a failed API call stays on the page
      }
    }
  };

  const handleCancel = () => {
    navigate(`/groups`);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) {
      return;
    }

    const file = files[0];
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    const maxSize = 1 * 1024 * 1024; // 1MB in bytes

    // Check file type
    if (!validTypes.includes(file.type)) {
      setErrors(prev => ({
        ...prev,
        groupPhoto: 'Only JPG, JPEG, and PNG files are allowed'
      }));
      // Clear the file input
      e.target.value = '';
      return;
    }

    // Check file size
    if (file.size > maxSize) {
      setErrors(prev => ({
        ...prev,
        groupPhoto: 'File size must be less than 1MB'
      }));
      // Clear the file input
      e.target.value = '';
      // Clear the selected file from state
      setFormData(prev => ({ ...prev, groupPhoto: null, photoPreview: null }));
      return;
    }

    // Clear any previous errors
    setErrors(prev => ({
      ...prev,
      groupPhoto: ''
    }));

    // Create preview URL for the selected file
    const previewUrl = URL.createObjectURL(file);

    // If validation passes, set the file and preview
    setFormData(prev => ({ 
      ...prev, 
      groupPhoto: file,
      photoPreview: previewUrl
    }));
  };

  const handleRemovePhoto = () => {
    // Clear the file input
    const fileInput = document.getElementById('groupPhoto') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
    
    // Clear newly selected file and preview only
    setFormData(prev => ({
      ...prev,
      groupPhoto: null,
      photoPreview: null,
    }));
    
    // Clear any photo errors
    setErrors(prev => ({
      ...prev,
      groupPhoto: ''
    }));
  };

  if (isGroupLoading) {
    return (
      <div className="min-h-screen">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-20">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-800 rounded mb-4 mx-auto max-w-md"></div>
              <div className="h-64 bg-gray-800 rounded-xl mb-4 mx-auto max-w-4xl"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!groupData?.data) {
    return (
      <div className="min-h-screen">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-20">
            <div className="text-gray-400 text-lg">Group not found</div>
            <button
              className="mt-4 px-4 py-2 rounded-full border border-orange-600 text-white hover:bg-orange-600/10"
              onClick={() => navigate("/groups")}
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-8">
        <PageHeader
          breadcrumbs={[
            { label: "Groups", onClick: () => navigate(-1) },
            { label: "Edit Group", onClick: () => { } }
          ]}
        />
        <div className="w-full">
          <GradientContainer>
            <div className="p-6">
              <h2 className="text-2xl font-bold text-white mb-6">Edit Group</h2>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* First Row - 3 inputs */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <FormInput
                      label="Group Name"
                      name="groupName"
                      value={formData.groupName}
                      onChange={(value) => handleInputChange("groupName", value)}
                      placeholder="Enter group name"
                      required
                      error={errors.groupName}
                    />
                  </div>
                  <div>
                    <FormSelect
                      label="Group Privacy"
                      name="groupPrivacy"
                      value={formData.groupPrivacy}
                      onChange={(value) => handleInputChange("groupPrivacy", value)}
                      options={privacyOptions}
                      required
                      error={errors.groupPrivacy}
                    />
                  </div>
                  <div>
                    <FormSelect
                      label="Category"
                      name="category"
                      value={formData.category}
                      onChange={(value) => handleInputChange("category", value)}
                      options={categoryOptions}
                    />
                  </div>
                </div>

                {/* Second Row - Other Category, Location, and Photo inputs */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {formData.category === "other" && (
                    <div className="md:col-span-1">
                      <FormInput
                        label="Specify Category"
                        name="otherCategory"
                        value={formData.otherCategory}
                        onChange={(value) => handleInputChange("otherCategory", value)}
                        placeholder="Enter custom category"
                        required
                        error={errors.otherCategory}
                      />
                    </div>
                  )}
                  <div className="md:col-span-1">
                    <FormInput
                      label="Location"
                      name="location"
                      value={formData.location}
                      onChange={(value) => handleInputChange("location", value)}
                      placeholder="e.g., New York, Remote"
                    />
                  </div>
                  <div className="md:col-span-1">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Group Photo <span className="text-gray-500">(Max 1MB, JPG/JPEG/PNG only)</span>
                    </label>

                    <div className="relative">
                      <input
                        type="file"
                        accept="image/jpeg,image/jpg,image/png"
                        onChange={handleFileChange}
                        className="hidden"
                        id="groupPhoto"
                      />
                      <div className="flex items-stretch h-11">
                        <div
                          className={`flex-1 flex items-center justify-between bg-[#21272D] border ${errors.groupPhoto ? "border-red-500" : "border-gray-700"
                            } rounded px-3 text-gray-300 cursor-pointer hover:border-orange-500 transition-colors`}
                          onClick={() => {
                            document.getElementById('groupPhoto')?.click();
                          }}
                        >
                          <span className="truncate max-w-[180px] text-sm">
                            {formData.groupPhoto ? formData.groupPhoto.name : (formData.currentPhotoUrl && formData.currentPhotoUrl !== placeholderImageUrl ? "photo.png" : "Choose File")}
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                formData.groupPhoto ? handleRemovePhoto() : document.getElementById('groupPhoto')?.click();
                              }}
                              className={`text-xs px-2 py-1 rounded whitespace-nowrap transition-colors ${formData.groupPhoto
                                ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                                : (formData.currentPhotoUrl && formData.currentPhotoUrl !== placeholderImageUrl)
                                  ? "bg-[#D85D27] text-white hover:bg-orange-700"
                                  : "bg-gray-600 text-gray-300 hover:bg-gray-700"
                                }`}
                            >
                              {formData.groupPhoto ? "Remove" : (formData.currentPhotoUrl && formData.currentPhotoUrl !== placeholderImageUrl ? "Change" : "Upload")}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      JPG, JPEG, PNG only. Max 1MB.
                    </p>
                    {errors.groupPhoto && (
                      <p className="text-red-500 text-sm">{errors.groupPhoto}</p>
                    )}
                  </div>
                  {/* Photo Preview - Show existing or newly selected photo */}
                  {(formData.currentPhotoUrl || formData.photoPreview) ? (
                    <div className="md:col-span-1">
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Photo Preview
                      </label>
                      <div className="relative w-full h-24 bg-[#21272D] border border-gray-700 rounded-lg overflow-hidden">
                        <img
                          src={formData.photoPreview || formData.currentPhotoUrl}
                          alt="Group preview"
                          className="w-full h-full object-cover"
                        />
                        {/* Only show × to cancel a newly selected file, not to clear existing */}
                        {formData.groupPhoto && (
                          <button
                            type="button"
                            onClick={handleRemovePhoto}
                            className="absolute top-2 right-2 w-6 h-6 bg-red-500/80 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors text-lg font-bold"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    </div>
                  ) : null}
                </div>

                {/* Third Row - Location */}
                <div className="md:col-span-1">
                  <FormTextarea
                    label="Description"
                    name="description"
                    value={formData.description}
                    onChange={(value) => handleInputChange("description", value)}
                    placeholder="Describe what your group is about..."
                    rows={4}
                  />
                </div>
                {/* Action Buttons */}
                <div className="flex gap-3 pt-6 justify-start">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="px-6 py-2 bg-[#D85D27] text-white rounded-lg hover:bg-orange-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? 'Updating...' : 'Update Group'}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="px-6 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-800 transition"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </GradientContainer>
        </div>
      </div>
    </div>
  );
};

export default EditGroupPage;

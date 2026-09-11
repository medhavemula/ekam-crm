import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../../components/navigation/Navbar";
import PageHeader from "../../components/common/PageHeader";
import FormInput from "../../components/forms/FormInput";
import FormSelect from "../../components/forms/FormSelect";
import FormTextarea from "../../components/forms/FormTextarea";
import GradientContainer from "../../components/common/GradientContainer";
import { useCreateGroupMutation, useGetPresignCoverUrlMutation } from "../../services/groupsApi";

const CreateGroupPage: React.FC = () => {
  const navigate = useNavigate();
  const [createGroup, { isLoading }] = useCreateGroupMutation();
  const [getPresignCoverUrl] = useGetPresignCoverUrlMutation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    groupName: "",
    groupPrivacy: "",
    category: "",
    otherCategory: "",
    location: "",
    description: "",
    groupPhoto: null as File | null
  });

  const [errors, setErrors] = useState({
    groupName: "",
    groupPrivacy: "",
    category: "",
    otherCategory: "",
    groupPhoto: ""
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

  const handleInputChange = (field: string, value: string | File | null) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user starts typing
    if (field === 'otherCategory' ? errors.otherCategory : errors[field as keyof typeof errors]) {
      setErrors(prev => ({
        ...prev,
        [field]: ""
      }));
    }
  };

  const validateForm = () => {
    const newErrors: {
      groupName: string;
      groupPrivacy: string;
      category: string;
      otherCategory: string;
      groupPhoto: string;
    } = {
      groupName: "",
      groupPrivacy: "",
      category: "",
      otherCategory: "",
      groupPhoto: ""
    };

    if (!formData.groupName.trim()) {
      newErrors.groupName = "Group name is required";
    }

    if (!formData.groupPrivacy) {
      newErrors.groupPrivacy = "Group privacy is required";
    }

    if (!formData.category) {
      newErrors.category = "Category is required";
    }

    if (formData.category === "other" && !formData.otherCategory.trim()) {
      newErrors.otherCategory = "Please specify the category";
    }

    if (!formData.groupPhoto) {
      newErrors.groupPhoto = "";
    }

    setErrors(newErrors);
    return !newErrors.groupName && !newErrors.groupPrivacy && !newErrors.category && !newErrors.otherCategory;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent multiple submissions
    if (isSubmitting || isLoading) return;
    
    if (validateForm()) {
      setIsSubmitting(true);
      try {
        let coverImageUrl: string | undefined;

        // Upload image if provided
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
        }

        const groupData = {
          name: formData.groupName,
          description: formData.description,
          privacy: (formData.groupPrivacy === "public" ? "PUBLIC" : "PRIVATE") as "PUBLIC" | "PRIVATE",
          category: formData.category === "other" ? formData.otherCategory : formData.category,
          location: formData.location,
          coverImageUrl,
        };

        await createGroup(groupData).unwrap();
        navigate("/groups"); // Redirect to groups page after creation
      } catch (error) {
        console.error("Failed to create group:", error);
        // TODO: Show error message to user
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleCancel = () => {
    navigate("/groups");
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
      setFormData(prev => ({ ...prev, groupPhoto: null }));
      return;
    }
    
    // Clear any previous errors
    setErrors(prev => ({
      ...prev,
      groupPhoto: ''
    }));
    
    // If validation passes, set the file
    handleInputChange("groupPhoto", file);
  };

  return (
    <div className="min-h-screen bg-[#0f1419]">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <PageHeader 
          breadcrumbs={[
            { label: "Groups", onClick: () => navigate("/groups") },
            { label: "Create Group", onClick: () => {} }
          ]}
        />

        <div className="w-full">
          <GradientContainer>
            <div className="p-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* First Row - 3 inputs */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <FormInput
                      label="Group Name"
                      value={formData.groupName}
                      onChange={(e) => handleInputChange("groupName", (e as React.ChangeEvent<HTMLInputElement>).target.value)}
                      placeholder="Enter group name"
                      required
                      isRequired
                      error={errors.groupName}
                    />
                  </div>
                  <div>
                    <FormSelect
                      label="Group Privacy"
                      value={formData.groupPrivacy}
                      onChange={(e) => handleInputChange("groupPrivacy", (e as React.ChangeEvent<HTMLSelectElement>).target.value)}
                      options={privacyOptions}
                      required
                      isRequired
                      error={errors.groupPrivacy}
                    />
                  </div>
                  <div>
                    <FormSelect
                      label="Category"
                      value={formData.category}
                      onChange={(e) => handleInputChange("category", (e as React.ChangeEvent<HTMLSelectElement>).target.value)}
                      options={categoryOptions}
                      required
                      isRequired
                      error={errors.category}
                    />
                  </div>
                </div>

                {/* Second Row - Other Category, Location, and Photo inputs */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {formData.category === "other" && (
                    <div>
                      <FormInput
                        label="Specify Category"
                        value={formData.otherCategory}
                        onChange={(e) => handleInputChange("otherCategory", (e as React.ChangeEvent<HTMLInputElement>).target.value)}
                        placeholder="Enter custom category"
                        required
                        isRequired
                        error={errors.otherCategory}
                      />
                    </div>
                  )}
                  <div>
                    <FormInput
                      label="Location"
                      value={formData.location}
                      onChange={(e) => handleInputChange("location", (e as React.ChangeEvent<HTMLInputElement>).target.value)}
                      placeholder="Enter Location"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-2">
                      Upload Group Photo <span className="text-gray-500">(Max 1MB, JPG/JPEG/PNG only)</span>
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
                          className={`flex-1 flex items-center justify-between bg-[#21272D] border ${
                            errors.groupPhoto ? "border-red-500" : "border-gray-700"
                          } rounded px-3 text-gray-300 cursor-pointer hover:border-orange-500 transition-colors`}
                          onClick={() => {
                            document.getElementById('groupPhoto')?.click();
                          }}
                        >
                          <span className="truncate max-w-[180px] text-sm">
                            {formData.groupPhoto ? formData.groupPhoto.name : "Choose File"}
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                              }}
                              className={`text-xs px-2 py-1 rounded whitespace-nowrap transition-colors ${
                                formData.groupPhoto 
                                  ? 'text-gray-300 bg-gray-700/50 hover:bg-gray-600/50 cursor-pointer' 
                                  : 'text-gray-300 bg-gray-700/50 cursor-default'
                              }`}
                              title={formData.groupPhoto ? "Change file" : ""}
                              disabled={!formData.groupPhoto}
                            >
                              {formData.groupPhoto ? "Change" : "No File Chosen"}
                            </button>
                            {formData.groupPhoto && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setFormData(prev => ({ ...prev, groupPhoto: null }));
                                  const fileInput = document.getElementById('groupPhoto') as HTMLInputElement;
                                  if (fileInput) fileInput.value = '';
                                }}
                                className="flex items-center justify-center w-6 h-6 rounded-full bg-[#D85D27] hover:bg-orange-700 text-white text-sm font-medium transition-colors"
                                title="Remove photo"
                              >
                                ×
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                      {errors.groupPhoto && (
                        <p className="text-xs text-red-400 mt-1">
                          {errors.groupPhoto}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Description - Full width */}
                <div>
                  <FormTextarea
                    label="Description"
                    value={formData.description}
                    onChange={(e) => handleInputChange("description", (e as React.ChangeEvent<HTMLTextAreaElement>).target.value)}
                    placeholder="Enter Description"
                    rows={4}
                  />
                </div>

                {/* Buttons */}
                <div className="flex justify-start space-x-4 pt-2">
                  <button
                    type="submit"
                    disabled={isLoading || isSubmitting}
                    className="px-6 py-2 bg-[#D85D27] text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading || isSubmitting ? "Creating..." : "Submit"}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
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

export default CreateGroupPage;

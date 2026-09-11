import React from "react";
import type { ChangeEvent } from "react";
import FormSelect from "../forms/FormSelect";
import type { BasicInfoData, FormErrors } from "../../types/registration.types";
import { useListChaptersQuery, useListCountriesQuery, useListRegionsQuery, useListSocialChaptersQuery } from "../../services/publicApi";

type LocationSelectionFieldsProps = {
  data: BasicInfoData;
  errors: FormErrors;
  onChange: (field: keyof BasicInfoData, value: string) => void;
  chapterValue: string;
  onChapterChange: (id: string, name: string) => void;
  useSocialChapters?: boolean;
};

function useDebounced<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = React.useState(value);
  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default function LocationSelectionFields({
  data,
  errors,
  onChange,
  chapterValue,
  onChapterChange,
  useSocialChapters = false,
}: LocationSelectionFieldsProps) {
  const [countrySearch, setCountrySearch] = React.useState("");
  const [regionSearch, setRegionSearch] = React.useState("");
  const [chapterSearch, setChapterSearch] = React.useState("");
  const debouncedCountrySearch = useDebounced(countrySearch);
  const debouncedRegionSearch = useDebounced(regionSearch);
  const debouncedChapterSearch = useDebounced(chapterSearch);

  const {
    data: countriesResp,
    isLoading: countriesLoading,
    isError: countriesError,
  } = useListCountriesQuery({ q: debouncedCountrySearch || undefined, limit: 20 });

  const {
    data: regionsResp,
    isLoading: regionsLoading,
    isError: regionsError,
  } = useListRegionsQuery(
    { countryId: data.countryId || "", q: debouncedRegionSearch || undefined, limit: 20 },
    { skip: !data.countryId }
  );

  const {
    data: chaptersResp,
    isLoading: chaptersLoading,
    isError: chaptersError,
  } = useListChaptersQuery(
    { regionId: data.regionId || "", q: debouncedChapterSearch || undefined, limit: 20 },
    { skip: !data.regionId || useSocialChapters }
  );

  const {
  data: socialChaptersResp,
  isLoading: socialChaptersLoading,
  isError: socialChaptersError,
} = useListSocialChaptersQuery(
  {
    regionId: data.regionId || undefined,
    q: debouncedChapterSearch || undefined,
    limit: 20,
  },
  {
    skip: !useSocialChapters || !data.regionId,
    refetchOnMountOrArgChange: true,
  }
);

  const countryOptions = React.useMemo(
    () =>
      (countriesResp?.data || []).map((c: any) => ({
        value: c.id,
        label: c.name,
      })),
    [countriesResp]
  );

  const regionOptions = React.useMemo(
    () =>
      (regionsResp?.data || []).map((r: any) => ({
        value: r.id,
        label: r.name,
      })),
    [regionsResp]
  );

  const chapterOptions = React.useMemo(() => {
  const items = useSocialChapters
    ? (socialChaptersResp?.data || []).filter((c: any) =>
        data.regionId ? c.regionId === data.regionId : true
      )
    : (chaptersResp?.data || []);

  return items.map((c: any) => ({
    value: c.id,
    label: c.name,
  }));
}, [
  chaptersResp,
  socialChaptersResp,
  useSocialChapters,
  data.regionId,
]);

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
      <FormSelect
        label="Country"
        options={countryOptions}
        placeholder={countriesLoading ? "Loading countries..." : "Select Country"}
        value={data.countryId || ""}
        onChange={(e: ChangeEvent<HTMLSelectElement>) => {
          const id = e.target.value;
          onChange("countryId", id);
          const name = countryOptions.find((o) => o.value === id)?.label || "";
          onChange("country", name);
          onChange("regionId", "");
          onChange("chapterRegistering", "");
          onChange("chapterName", "");
          onChapterChange("", "");
          onChange("state", "");
          onChange("city", "");
          onChange("pincode", "");
        }}
        error={errors.country || errors.countryId}
        isRequired
        searchable
        searchPlaceholder="Search countries"
        onSearchChange={setCountrySearch}
        disableClientSideFilter
        disabled={countriesLoading}
      />

      <FormSelect
        label="Region"
        options={regionOptions}
        placeholder={
          !data.countryId
            ? "Select country first"
            : regionsLoading
            ? "Loading regions..."
            : regionOptions.length
            ? "Select Region"
            : "No regions available"
        }
        value={data.regionId || ""}
        onChange={(e: ChangeEvent<HTMLSelectElement>) => {
          const id = e.target.value;
          onChange("regionId", id);
          onChange("chapterRegistering", "");
          onChange("chapterName", "");
          onChapterChange("", "");
        }}
        error={errors.regionId}
        isRequired
        searchable
        searchPlaceholder="Search regions"
        onSearchChange={setRegionSearch}
        disableClientSideFilter
        disabled={regionsLoading || !data.countryId}
      />

      <FormSelect
        key={`${useSocialChapters ? "social" : "normal"}-${data.regionId || "all"}`}
        label={useSocialChapters ? "Which Social chapter are you registering for?" : "Which chapter are you registering for?"}
        options={chapterOptions}
        placeholder={
          useSocialChapters
            ? socialChaptersLoading
              ? "Loading social chapters..."
              : chapterOptions.length
              ? "Select your social chapter"
              : "No social chapters available"
            : !data.regionId
            ? "Select region first"
            : chaptersLoading
            ? "Loading chapters..."
            : chapterOptions.length
            ? "Select your chapter"
            : "No chapters available"
        }
        value={chapterValue}
        onChange={(e: ChangeEvent<HTMLSelectElement>) => {
          const id = e.target.value;
          const name = chapterOptions.find((o) => o.value === id)?.label || "";
          onChapterChange(id, name);
        }}
        error={errors.chapterRegistering || errors.socialChapter}
        isRequired
        searchable
        searchPlaceholder={useSocialChapters ? "Search social chapters" : "Search chapters"}
        onSearchChange={setChapterSearch}
        disableClientSideFilter
        disabled={useSocialChapters ? socialChaptersLoading || !chapterOptions.length : !data.regionId || chaptersLoading || !chapterOptions.length}
      />

      {(countriesError || regionsError || chaptersError || socialChaptersError) && (
        <p className="text-xs text-yellow-400 md:col-span-3">Unable to load location options right now. Please try again.</p>
      )}
    </div>
  );
}

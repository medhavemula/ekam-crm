import { useState } from "react";
import DatePicker from "../../components/common/DatePicker";
import { FormSelect } from "../../components/forms";
import { SocialLayout } from "../../components/social";
import CalendarIcon from "../../assets/icons/calendar.svg";

export default function EventsRequest() {
  const [fromDate, setFromDate] = useState("2025-08-06");
  const [toDate, setToDate] = useState("2025-06-06");
  const [selectedCountry, setSelectedCountry] = useState("");
  const [selectedRegion, setSelectedRegion] = useState("");
  const [selectedChapter, setSelectedChapter] = useState("");
  const [selectedEventType, setSelectedEventType] = useState("");

  const countryOptions = [
    { value: "", label: "Select country" },
    { value: "india", label: "India" },
    { value: "usa", label: "USA" },
    { value: "nepal", label: "Nepal" },
  ];

  const regionOptions = [
    { value: "", label: "Select Regions" },
    { value: "north", label: "North" },
    { value: "south", label: "South" },
    { value: "east", label: "East" },
    { value: "west", label: "West" },
  ];

  const chapterOptions = [
    { value: "", label: "Select chapter name" },
    { value: "chapter1", label: "Chapter 1" },
    { value: "chapter2", label: "Chapter 2" },
  ];

  const eventTypeOptions = [
    { value: "", label: "Select event type" },
    { value: "All", label: "All" },
    { value: "Donation", label: "Donation" },
    { value: "Fundraiser", label: "Fundraiser" },
    { value: "Meeting", label: "Meeting" },
  ];

  return (
    <SocialLayout>
      {/* Filters */}
      <div className=" py-1 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-2">
          <div className="w-full ">
            <label className="block text-xs text-gray-400 mb-1.5">
              From Date <span className="text-red-400">*</span>
            </label>
            <DatePicker value={fromDate} onChange={setFromDate} iconSrc={CalendarIcon} placeholder="Select From Date" />
          </div>

          <div className="w-full ">
            <label className="block text-xs text-gray-400 mb-1.5">
              To Date <span className="text-red-400">*</span>
            </label>
            <DatePicker value={toDate} onChange={setToDate} iconSrc={CalendarIcon} placeholder="Select To Date" />
          </div>
          <FormSelect
            label="Countries"
            options={countryOptions}
            placeholder="Select country"
            value={selectedCountry}
            onChange={(e) => setSelectedCountry(e.target.value)}
          />
          <FormSelect
            label="Regions"
            options={regionOptions}
            placeholder="Select Regions"
            value={selectedRegion}
            onChange={(e) => setSelectedRegion(e.target.value)}
          />
          <FormSelect
            label="Chapter"
            options={chapterOptions}
            placeholder="Select chapter name"
            value={selectedChapter}
            onChange={(e) => setSelectedChapter(e.target.value)}
          />
          <FormSelect
            label="Event Type"
            options={eventTypeOptions}
            placeholder="Select event type"
            value={selectedEventType}
            onChange={(e) => setSelectedEventType(e.target.value)}
          />
          <div className="flex items-end">
            <button className="w-full bg-[#D85D27] hover:bg-[#C24F20] text-white rounded-lg px-4 py-3 text-sm font-medium transition-colors">
              Search
            </button>
          </div>
        </div>
      </div>

      {/* Placeholder table / list for event requests */}
      <div className="border border-white/10 rounded-2xl bg-[#111827] p-6 text-gray-300 text-sm text-center">
        Events Request list will go here.
      </div>
    </SocialLayout>
  );
}

/**
 * Fallback dataset for static preview environments (such as GitHub Pages)
 * where the backend server's CORS configuration restricts browser requests.
 * Contains the snapshot from the live production database so all metrics,
 * charts, filters, and records render accurately instead of displaying zeros.
 */

export function getMockFallbackResponse(urlStr: string, params?: any): { data: any } | null {
  if (!urlStr) return null;
  const url = urlStr.replace(/^\/+/, "");

  // Super Admin KPIs
  if (url.startsWith("admin/kpis")) {
    return {
      data: {
        success: true,
        data: {
          countries: 1,
          totalCountries: 1,
          regions: 2,
          totalRegions: 2,
          chapters: 2,
          totalChapters: 2,
          members: 5,
          totalMembers: 5,
          totalChapterMembers: 5,
          businessOpportunity: 6,
          businessClosed: 132000,
          currency: "INR",
        },
      },
    };
  }

  // Super Admin Dashboard totals & series
  if (url.startsWith("admin/dashboard")) {
    return {
      data: {
        success: true,
        data: {
          totals: {
            countries: 1,
            regions: 2,
            chapters: 2,
            members: 5,
            businessOpportunity: 6,
            businessClosed: 132000,
          },
          series: {
            chaptersGrowth: [
              { period: "2026-08", count: 1 },
              { period: "2026-09", count: 1 },
            ],
            opportunities: [
              { period: "2026-09", count: 6 },
            ],
            businessClosed: [
              { period: "2026-09", amount: 132000, currency: "INR" },
            ],
          },
        },
      },
    };
  }

  // Admin Series (Charts for Super Admin)
  if (url.startsWith("admin/series")) {
    const metric = params?.metric;
    if (metric === "chapters") {
      return {
        data: {
          success: true,
          data: {
            metric: "chapters",
            series: [
              { label: "Aug 2026", value: 1, month: "2026-08", count: 1, week: "2026-W35" },
              { label: "Sep 2026", value: 1, month: "2026-09", count: 1, week: "2026-W36" },
            ],
          },
        },
      };
    }
    if (metric === "opportunity") {
      return {
        data: {
          success: true,
          data: {
            metric: "opportunity",
            series: [
              { label: "Week 1", value: 2, month: "2026-09", count: 2, week: "2026-W36" },
              { label: "Week 2", value: 4, month: "2026-09", count: 4, week: "2026-W37" },
            ],
          },
        },
      };
    }
    // business_closed
    return {
      data: {
        success: true,
        data: {
          metric: "businessClosed",
          series: [
            { label: "Week 1", value: 50000, month: "2026-09", amount: 50000, currency: "INR", week: "2026-W36" },
            { label: "Week 2", value: 82000, month: "2026-09", amount: 82000, currency: "INR", week: "2026-W37" },
          ],
        },
      },
    };
  }

  // Admin Filters (countries, regions, chapters)
  if (url.startsWith("admin/filters")) {
    return {
      data: {
        success: true,
        data: {
          countries: [{ id: "6a7d6e996cee3c60a23a2837", name: "India" }],
          regions: [
            { id: "6a7d6ea56cee3c60a23a284a", name: "Hyderabad", country_id: "6a7d6e996cee3c60a23a2837" },
            { id: "6a7d6f0a6cee3c60a23a285a", name: "Mumbai", country_id: "6a7d6e996cee3c60a23a2837" },
          ],
          chapters: [
            { id: "6a911fa5a8ef4664d39e80a0", name: "alice", region_id: "6a7d6ea56cee3c60a23a284a" },
            { id: "6a96b1c9135d80a425095b4c", name: "Malice", region_id: "6a7d6f0a6cee3c60a23a285a" },
          ],
          roles: ["COUNTRY_ADMIN", "EXECUTIVE_DIRECTOR", "REGIONAL_DIRECTOR", "ASSISTANT_REGIONAL_DIRECTOR"],
        },
      },
    };
  }

  // Countries Geo API
  if (url.startsWith("admin/sa/geo/countries")) {
    return {
      data: {
        success: true,
        data: {
          items: [
            {
              id: "6a7d6e996cee3c60a23a2837",
              name: "India",
              iso2: "IN",
              slug: "india",
              status: "ACTIVE",
              regionCount: 2,
              createdAt: "2026-08-13T07:13:29.133Z",
              updatedAt: "2026-08-13T07:13:29.133Z",
            },
          ],
          page: 1,
          pageSize: 25,
          total: 1,
        },
      },
    };
  }

  // Regions Geo API
  if (url.startsWith("admin/sa/geo/regions")) {
    return {
      data: {
        success: true,
        data: {
          items: [
            {
              id: "6a7d6ea56cee3c60a23a284a",
              name: "Hyderabad",
              slug: "hyderabad",
              status: "ACTIVE",
              country: { id: "6a7d6e996cee3c60a23a2837" },
              chapterCount: 1,
              createdAt: "2026-08-13T07:13:41.362Z",
              updatedAt: "2026-08-13T07:13:41.362Z",
            },
            {
              id: "6a7d6f0a6cee3c60a23a285a",
              name: "Mumbai",
              slug: "mumbai",
              status: "ACTIVE",
              country: { id: "6a7d6e996cee3c60a23a2837" },
              chapterCount: 1,
              createdAt: "2026-08-13T07:15:22.263Z",
              updatedAt: "2026-08-13T07:15:22.263Z",
            },
          ],
          page: 1,
          pageSize: 25,
          total: 2,
        },
      },
    };
  }

  // ED Chapters
  if (url.startsWith("admin/ed/chapters")) {
    return {
      data: {
        success: true,
        data: {
          items: [
            {
              id: "6a96b1c9135d80a425095b4c",
              name: "Malice",
              regionId: "6a7d6f0a6cee3c60a23a285a",
              regionName: "Mumbai",
              area: "Borivali",
              city: "Borivali",
              members: 1,
              launchDate: "2026-09-01T00:00:00.000Z",
              meetingDate: "2026-09-02T00:00:00.000Z",
              nextMeetingDate: "2026-09-16T00:00:00.000Z",
              lastMeetingDate: "2026-09-09T00:00:00.000Z",
              meetingType: "WEEKLY",
              meetingMode: "IN_PERSON",
              meetingDay: "WED",
              meetingTime: "07:00",
              meetingCadence: "WEEKLY",
              meetingWeekday: 3,
              status: "ACTIVE",
            },
            {
              id: "6a911fa5a8ef4664d39e80a0",
              name: "alice",
              regionId: "6a7d6ea56cee3c60a23a284a",
              regionName: "Hyderabad",
              area: "Himaythnagar",
              city: "Himaythnagar",
              members: 4,
              launchDate: "2026-08-28T00:00:00.000Z",
              meetingDate: "2026-08-28T00:00:00.000Z",
              nextMeetingDate: "2026-09-25T00:00:00.000Z",
              lastMeetingDate: "2026-09-11T00:00:00.000Z",
              meetingType: "ALTERNATE",
              meetingMode: "IN_PERSON",
              meetingDay: "FRI",
              meetingTime: "09:00",
              meetingCadence: "ALTERNATE",
              meetingWeekday: 5,
              status: "ACTIVE",
            },
          ],
          stats: { totalChapters: 2, totalMembers: 5, totalAreas: 2 },
          page: 1,
          limit: 10,
          total: 2,
        },
      },
    };
  }

  // Members
  if (url.startsWith("admin/ed/approvals/approved") || url.startsWith("members")) {
    return {
      data: {
        success: true,
        data: [
          {
            _id: "6aa1411b13a64a9fab8cb438",
            name: "Van dutch",
            email: "darshangajbhiye@myyahoo.com",
            status: "active",
            basicInfo: {
              phone: "9876543233",
              gender: "male",
              country: { _id: "6a7d6e996cee3c60a23a2837", name: "India" },
              region: { _id: "6a7d6ea56cee3c60a23a284a", name: "Hyderabad" },
              chapter: { _id: "6a911fa5a8ef4664d39e80a0", name: "alice" },
            },
            business: {
              businessName: "Dutch Kitchen",
              businessCategory: "Food Truck",
              sponsorName: "Mahendra (Malice)",
            },
            moduleAccess: { business: true, professional: true, social: false },
          },
          {
            _id: "6a96b265135d80a425095d7d",
            name: "Mahendra",
            email: "thebrandchimpchatgpt@gmail.com",
            status: "active",
            basicInfo: {
              phone: "765432248777",
              gender: "male",
              country: { _id: "6a7d6e996cee3c60a23a2837", name: "India" },
              region: { _id: "6a7d6f0a6cee3c60a23a285a", name: "Mumbai" },
              chapter: { _id: "6a96b1c9135d80a425095b4c", name: "Malice" },
            },
            business: {
              businessName: "Tech Solutions",
              businessCategory: "Technology",
              sponsorName: "Self",
            },
            moduleAccess: { business: true, professional: false, social: false },
          },
          {
            _id: "6a96a1ce6b7dc5f44ff97b6b",
            name: "Akhil Albert",
            email: "design.thebrandchimp@gmail.com",
            status: "active",
            basicInfo: {
              phone: "7510489831",
              gender: "male",
              country: { _id: "6a7d6e996cee3c60a23a2837", name: "India" },
              region: { _id: "6a7d6ea56cee3c60a23a284a", name: "Hyderabad" },
              chapter: { _id: "6a911fa5a8ef4664d39e80a0", name: "alice" },
            },
            business: {
              businessName: "AA Enterprise",
              businessCategory: "Metal Sheet",
              sponsorName: "Darshan (alice)",
            },
            moduleAccess: { business: true, professional: true, social: false },
          },
          {
            _id: "6a954d0654130263546eaf65",
            name: "Darshan",
            email: "varshikatbc@gmail.com",
            status: "active",
            basicInfo: {
              phone: "08880333777",
              gender: "male",
              country: { _id: "6a7d6e996cee3c60a23a2837", name: "India" },
              region: { _id: "6a7d6ea56cee3c60a23a284a", name: "Hyderabad" },
              chapter: { _id: "6a911fa5a8ef4664d39e80a0", name: "alice" },
            },
            business: {
              businessName: "Dr Test Clinic",
              businessCategory: "Hospital",
              sponsorName: "Self",
            },
            moduleAccess: { business: true, professional: false, social: false },
          },
          {
            _id: "6a9528e78a20a6b9d63465eb",
            name: "Mohammad Maheen",
            email: "saitejagarabapu@gmail.com",
            status: "active",
            basicInfo: {
              phone: "6309483357",
              gender: "male",
              country: { _id: "6a7d6e996cee3c60a23a2837", name: "India" },
              region: { _id: "6a7d6ea56cee3c60a23a284a", name: "Hyderabad" },
              chapter: { _id: "6a911fa5a8ef4664d39e80a0", name: "alice" },
            },
            business: {
              businessName: "Maheen Services",
              businessCategory: "Services",
              sponsorName: "Self",
            },
            moduleAccess: { business: true, professional: true, social: false },
          },
        ],
        pagination: { page: 1, limit: 20, total: 5, totalPages: 1 },
      },
    };
  }

  // Users Me
  if (url.startsWith("users/me")) {
    return {
      data: {
        success: true,
        data: {
          _id: "6a7d6d2b1953648c93c2184a",
          name: "Super Admin",
          email: "superadmin@ekam.local",
          role: "SUPER_ADMIN",
          roles: ["SUPER_ADMIN"],
          isEmailVerified: true,
          isApproved: true,
          status: "active",
          assignments: [{ role: "SUPER_ADMIN" }],
          moduleAccess: { business: true, professional: true, social: true },
        },
      },
    };
  }

  // Approvals & Franchises general
  if (url.includes("approvals")) {
    return { data: { success: true, data: [] } };
  }
  if (url.includes("franchise")) {
    return { data: { success: true, data: [] } };
  }

  return null;
}

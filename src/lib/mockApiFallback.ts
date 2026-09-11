/**
 * Fallback dataset for static preview environments (such as GitHub Pages)
 * where the backend server's CORS configuration restricts browser requests.
 * Contains the snapshot from the live production database so all metrics,
 * charts, filters, and records render accurately instead of displaying zeros
 * or "Error loading data" banners.
 */

export function getMockFallbackResponse(urlStr: string, params?: any): { data: any } | null {
  if (!urlStr) return null;
  const url = urlStr.replace(/^\/+/, "");

  // Auth: Login fallback for static preview environments (GitHub Pages)
  if (url.startsWith("auth/login")) {
    const rawEmail = params?.email ? String(params.email).trim().toLowerCase() : "";
    const isSuper = !rawEmail || rawEmail.includes("admin") || rawEmail.includes("superadmin");
    const role = isSuper ? "SUPER_ADMIN" : "USER";
    const name = isSuper ? "Super Admin" : "Ekam Member";
    const email = rawEmail || (isSuper ? "superadmin@ekam.local" : "member@ekam.local");
    const demoToken =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImRlbW8tdXNlci0wMDEiLCJlbWFpbCI6InN1cGVyYWRtaW5AZWthbS5sb2NhbCIsInJvbGUiOiJTVVBFUl9BRE1JTiIsImV4cCI6MjUzNzQzODgwMH0.mockSignature";

    return {
      data: {
        success: true,
        accessToken: demoToken,
        refreshToken: "demo-refresh-token",
        role,
        roles: [role],
        name,
        email,
        _id: "demo-user-001",
        isEmailVerified: true,
        isApproved: true,
        status: "active",
        assignments: [{ role }],
        moduleAccess: { business: true, professional: true, social: true },
      },
    };
  }

  // Auth: Token Refresh fallback
  if (url.startsWith("auth/refresh")) {
    const demoToken =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImRlbW8tdXNlci0wMDEiLCJlbWFpbCI6InN1cGVyYWRtaW5AZWthbS5sb2NhbCIsInJvbGUiOiJTVVBFUl9BRE1JTiIsImV4cCI6MjUzNzQzODgwMH0.mockSignature";
    return {
      data: {
        success: true,
        accessToken: demoToken,
        refreshToken: "demo-refresh-token",
      },
    };
  }

  // Auth: Logout fallback
  if (url.startsWith("auth/logout")) {
    return {
      data: {
        success: true,
        message: "Logged out successfully",
      },
    };
  }

  // User Profile / Current Authenticated User fallback
  if (url.startsWith("users/me") || url.startsWith("account/me") || url.startsWith("users/profile")) {
    const storedRole = (typeof localStorage !== "undefined" && localStorage.getItem("userRole")) || "SUPER_ADMIN";
    const storedEmail = (typeof localStorage !== "undefined" && localStorage.getItem("userEmail")) || "superadmin@ekam.local";
    const storedName = (typeof localStorage !== "undefined" && localStorage.getItem("userName")) || "Super Admin";
    return {
      data: {
        success: true,
        data: {
          _id: "demo-user-001",
          name: storedName,
          email: storedEmail,
          isEmailVerified: true,
          isApproved: true,
          status: "active",
          assignments: [{ role: storedRole }],
          basicInfo: {
            chapter: "Apex Chapter",
          },
          business: {
            businessName: "Ekam Global Enterprise",
          },
          professional: {
            role: storedRole,
          },
          moduleAccess: {
            business: true,
            professional: true,
            social: true,
          },
        },
      },
    };
  }

  // Notifications counters
  if (url.startsWith("notifications/counters") || url.startsWith("notifications/unread-count")) {
    return {
      data: {
        success: true,
        data: {
          unreadCount: 0,
          total: 0,
        },
      },
    };
  }

  // User Profile Roles
  if (url.startsWith("user/profile/roles")) {
    const storedRole = (typeof localStorage !== "undefined" && localStorage.getItem("userRole")) || "SUPER_ADMIN";
    return {
      data: {
        success: true,
        data: {
          user: {
            id: "demo-user-001",
            name: "Super Admin",
            email: "superadmin@ekam.local",
          },
          assignments: [{ role: storedRole, isPrimary: true }],
          primaryRole: { role: storedRole, isPrimary: true },
        },
      },
    };
  }

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

  // ED Opportunities (Admin Business Opportunity report)
  if (url.startsWith("admin/ed/opportunities") || url.startsWith("admin/ed/business-opportunities")) {
    return {
      data: {
        success: true,
        kpis: { totalMembers: 5, businessClosedTotal: 132000 },
        chapter: null,
        region: null,
        dateRange: { from: null, to: null },
        items: [
          {
            borDate: "2026-09-11T11:03:45.282Z",
            fromName: "Mohammad Maheen",
            phone: "6309483357",
            email: "saitejagarabapu@gmail.com",
            referredToName: "Darshan",
            lastUpdated: "2026-09-11T11:03:45.282Z",
            status: "Not Contacted",
            businessClosed: 0,
            comments: "New prospective contract discussion",
          },
          {
            borDate: "2026-09-11T08:19:14.429Z",
            fromName: "Van dutch",
            phone: "9876543233",
            email: "darshangajbhiye@myyahoo.com",
            referredToName: "Darshan",
            lastUpdated: "2026-09-11T08:24:20.063Z",
            status: "Got Business",
            businessClosed: 100000,
            comments: "Kitchen supplies wholesale contract",
          },
          {
            borDate: "2026-09-10T12:29:48.467Z",
            fromName: "Darshan",
            phone: "08880333777",
            email: "varshikatbc@gmail.com",
            referredToName: "Akhil Albert",
            lastUpdated: "2026-09-10T12:29:48.467Z",
            status: "Not Contacted",
            businessClosed: 0,
            comments: "Interior sheet design collaboration",
          },
          {
            borDate: "2026-09-10T12:29:03.479Z",
            fromName: "Darshan",
            phone: "08880333777",
            email: "varshikatbc@gmail.com",
            referredToName: "Van dutch",
            lastUpdated: "2026-09-10T12:29:03.479Z",
            status: "Not Contacted",
            businessClosed: 0,
            comments: "Food truck fabrication",
          },
          {
            borDate: "2026-09-10T11:01:08.456Z",
            fromName: "Mahendra",
            phone: "98765432",
            email: "thebrandchimpchatgpt@gmail.com",
            referredToName: "Darshan",
            lastUpdated: "2026-09-10T11:01:08.456Z",
            status: "Got Business",
            businessClosed: 12000,
            comments: "Branding materials",
          },
          {
            borDate: "2026-09-09T12:04:13.118Z",
            fromName: "Van dutch",
            phone: "9876543233",
            email: "darshangajbhiye@myyahoo.com",
            referredToName: "Darshan",
            lastUpdated: "2026-09-09T12:05:01.582Z",
            status: "Got Business",
            businessClosed: 20000,
            comments: "Catering setup",
          },
        ],
        pagination: { page: 1, limit: 25, total: 6 },
      },
    };
  }

  // Opportunities (Business Opportunities Given/Received/Closed)
  if (url.startsWith("opportunities")) {
    return {
      data: {
        success: true,
        data: [
          {
            id: "opp-001",
            createdAt: "2026-09-11T08:19:14.429Z",
            closedAt: "2026-09-11T08:24:20.063Z",
            amount: 100000,
            opportunitySource: "Internal Member",
            comments: "Kitchen supplies wholesale contract",
            creditedGiver: { name: "Van dutch" },
            receiver: { name: "Darshan" },
            status: "WON",
            contact: { name: "Van dutch", phone: "9876543233", email: "darshangajbhiye@myyahoo.com" },
          },
          {
            id: "opp-002",
            createdAt: "2026-09-09T12:04:13.118Z",
            closedAt: "2026-09-09T12:05:01.582Z",
            amount: 20000,
            opportunitySource: "Internal Member",
            comments: "Catering setup consulting",
            creditedGiver: { name: "Van dutch" },
            receiver: { name: "Darshan" },
            status: "WON",
            contact: { name: "Van dutch", phone: "9876543233", email: "darshangajbhiye@myyahoo.com" },
          },
          {
            id: "opp-003",
            createdAt: "2026-09-10T11:01:08.456Z",
            closedAt: "2026-09-10T11:01:08.456Z",
            amount: 12000,
            opportunitySource: "Referral",
            comments: "Branding materials package",
            creditedGiver: { name: "Mahendra" },
            receiver: { name: "Darshan" },
            status: "WON",
            contact: { name: "Mahendra", phone: "98765432" },
          },
        ],
        page: 1,
        pageSize: 10,
        total: 3,
      },
    };
  }

  // P2P Meetings (Peer to Peer)
  if (url.startsWith("p2p")) {
    return {
      data: {
        success: true,
        data: [
          {
            _id: "p2p-001",
            id: 1,
            date: "2026-09-08T10:00:00.000Z",
            meetWith: "Darshan",
            initiatedBy: "Van dutch",
            location: "Himaythnagar, Hyderabad",
            topic: "Strategic Franchise Expansion & Suppliers",
            status: "COMPLETED",
            recordId: "p2p-001",
          },
          {
            _id: "p2p-002",
            id: 2,
            date: "2026-09-05T14:30:00.000Z",
            meetWith: "Akhil Albert",
            initiatedBy: "Mohammad Maheen",
            location: "Borivali, Mumbai",
            topic: "Software Platform Testing & Deployment",
            status: "COMPLETED",
            recordId: "p2p-002",
          },
        ],
        page: 1,
        limit: 10,
        total: 2,
      },
    };
  }

  // Many To One (M2O)
  if (url.startsWith("m2o") || url.startsWith("admin/ed/m2o")) {
    return {
      data: {
        success: true,
        data: [
          {
            _id: "m2o-001",
            id: 1,
            date: "2026-09-07T11:00:00.000Z",
            presenter: "Darshan",
            chapter: "alice",
            topic: "Annual Business Goals & Growth Plan",
            attendeesCount: 5,
            status: "COMPLETED",
          },
        ],
        page: 1,
        limit: 10,
        total: 1,
      },
    };
  }

  // Meetings
  if (url.startsWith("meetings") || url.startsWith("admin/ed/meetings")) {
    return {
      data: {
        success: true,
        data: [
          {
            id: "meeting-001",
            date: "2026-09-25T00:00:00.000Z",
            startTime: "09:00",
            venue: "Hyatt Place, Hyderabad",
            mode: "IN_PERSON",
            type: "ALTERNATE",
            status: "DRAFT",
            members: 4,
            present: 4,
            late: 0,
            absent: 0,
            visitors: 5,
            p2p: 2,
            businessClosed: 132000,
            testimonials: 6,
          },
          {
            id: "meeting-002",
            date: "2026-09-11T00:00:00.000Z",
            startTime: "09:00",
            venue: "Regus Boardroom, Mumbai",
            mode: "IN_PERSON",
            type: "ALTERNATE",
            status: "COMPLETED",
            members: 4,
            present: 4,
            late: 0,
            absent: 0,
            visitors: 1,
            p2p: 2,
            businessClosed: 100000,
            testimonials: 4,
          },
        ],
        nextMeeting: null,
        page: 1,
        pageSize: 10,
        total: 2,
      },
    };
  }

  // Visitors
  if (url.startsWith("visitors") || url.startsWith("admin/ed/visitors")) {
    return {
      data: {
        success: true,
        data: [
          {
            id: "vis-001",
            chapterId: "6a911fa5a8ef4664d39e80a0",
            chapterName: "alice",
            visitorName: "Sai Teja",
            email: "sgarabapu@gmail.com",
            phone: "6305887411",
            visitDate: "2026-09-25T00:00:00.000Z",
            company: "Tech Infra Solutions",
            category: "Cloud Engineering",
            status: "REGISTERED",
            invitedByName: "Mohammad Maheen",
          },
          {
            id: "vis-002",
            chapterId: "6a911fa5a8ef4664d39e80a0",
            chapterName: "alice",
            visitorName: "Albert Lincolin",
            email: "joifiber@gmail.com",
            phone: "9876543234",
            visitDate: "2026-09-25T00:00:00.000Z",
            company: "Fiber Networks",
            category: "Telecommunications",
            status: "REGISTERED",
            invitedByName: "Darshan",
          },
        ],
        page: 1,
        pageSize: 10,
        total: 2,
        counts: { myAdded: 0, myInvited: 2, myRegistered: 2 },
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

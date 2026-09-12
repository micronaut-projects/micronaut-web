export type MainSiteFooterGroup = {
  title: string;
  links: Array<{
    label: string;
    href: string;
  }>;
};

export const mainSiteFooterGroups: MainSiteFooterGroup[] = [
  {
    title: "Resources",
    links: [
      { label: "Download", href: "/download/" },
      { label: "CLI", href: "/cli/" },
      { label: "Blog", href: "/blog/" },
      { label: "Upgrades", href: "/category/upgrade/" },
      { label: "Success Stories", href: "/micronaut-success-stories/" },
      { label: "FAQ", href: "/faq/" },
    ],
  },
  {
    title: "Security",
    links: [
      {
        label: "Security Announcements",
        href: "/category/security-announcements/",
      },
      {
        label: "Security Advisory Disclosure",
        href: "https://github.com/micronaut-projects/micronaut-policies/blob/main/SECURITY_ADVISORY_DISCLOSURE.md",
      },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Brand Guidelines", href: "/brand-guidelines/" },
      { label: "Logos", href: "/brand-guidelines/micronaut-logos/" },
      {
        label: "Contributor License Agreement",
        href: "https://github.com/micronaut-projects/micronaut-policies/blob/main/CONTRIBUTOR_LICENSE_AGREEMENT.md",
      },
      {
        label: "Intellectual Property",
        href: "https://github.com/micronaut-projects/micronaut-policies/blob/main/INTELLECTUAL_PROPERTY.md",
      },
      {
        label: "Trademark Policy",
        href: "/brand-guidelines/micronaut-trademark-policy/",
      },
    ],
  },
  {
    title: "Policies",
    links: [
      {
        label: "Governance",
        href: "https://github.com/micronaut-projects/micronaut-policies/blob/main/GOVERNANCE.md",
      },
      {
        label: "Maintainers",
        href: "https://github.com/micronaut-projects/micronaut-policies/blob/main/MAINTAINERS.md",
      },
      {
        label: "Contributing",
        href: "https://github.com/micronaut-projects/micronaut-policies/blob/main/CONTRIBUTING.md",
      },
      {
        label: "Code of Conduct",
        href: "https://github.com/micronaut-projects/micronaut-policies/blob/main/CODE_OF_CONDUCT.md",
      },
      {
        label: "Conflict",
        href: "https://github.com/micronaut-projects/micronaut-policies/blob/main/CONFLICT.md",
      },
      {
        label: "Succession",
        href: "https://github.com/micronaut-projects/micronaut-policies/blob/main/SUCCESSION.md",
      },
    ],
  },
  {
    title: "Support",
    links: [
      { label: "Commercial Support", href: "/support/" },
      { label: "Financial Sponsors", href: "/financial-sponsors/" },
      { label: "Partners", href: "/partners/" },
    ],
  },
  {
    title: "Planning",
    links: [
      {
        label: "Release Announcements",
        href: "/category/release-announcements/",
      },
      { label: "Roadmap", href: "/micronaut-roadmap/" },
      {
        label: "Versioning",
        href: "https://github.com/micronaut-projects/micronaut-policies/blob/main/VERSIONS_POLICY.md",
      },
      {
        label: "Release Management",
        href: "https://github.com/micronaut-projects/micronaut-policies/blob/main/RELEASE_MANAGEMENT.md",
      },
      {
        label: "Release Cadence",
        href: "https://github.com/micronaut-projects/micronaut-policies/blob/main/RELEASE_CADENCE.md",
      },
    ],
  },
  {
    title: "Learning",
    links: [
      { label: "Guides", href: "/guides/" },
      { label: "Docs", href: "/docs/" },
      {
        label: "Free Course",
        href: "https://mylearn.oracle.com/ou/course/micronaut-fundamentals/151938/",
      },
      { label: "Podcast", href: "https://micronautpodcast.com" },
    ],
  },
  {
    title: "RSS Feeds",
    links: [
      { label: "Blog", href: "/rss.xml" },
      { label: "Announcements", href: "/announcements/rss.xml" },
      {
        label: "Security Announcements",
        href: "/security-announcements/rss.xml",
      },
    ],
  },
];

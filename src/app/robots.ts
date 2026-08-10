import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const noIndex = process.env.NEXT_PUBLIC_NOINDEX === "true";

  if (noIndex) {
    return {
      rules: {
        userAgent: "*",
        disallow: "/",
      },
    };
  }

  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
  };
}

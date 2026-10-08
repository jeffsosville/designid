import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "designID",
  description: "Catalog your collection with Nomenclature for Museum Cataloging.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col">
        <div className="flex-1">{children}</div>
        <footer className="px-4 py-6 text-center text-xs text-stone-500">
          Object names from{" "}
          <a href="https://www.nomenclature.info" className="underline">
            Nomenclature for Museum Cataloging
          </a>{" "}
          (CHIN / AASLH), licensed CC BY 4.0.
        </footer>
      </body>
    </html>
  );
}

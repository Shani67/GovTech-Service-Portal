import type { Metadata } from "next";

export const metadata: Metadata = { title: "Accessibility statement" };

export default function AccessibilityPage() {
  return (
    <article className="max-w-2xl space-y-6">
      <h1 className="text-4xl font-bold">Accessibility statement</h1>
      <p>
        This statement applies to the Apply for a trade licence demonstration service. We want as
        many people as possible to be able to use it. For example, you should be able to:
      </p>
      <ul className="list-disc space-y-1 pl-6">
        <li>zoom in up to 400% without the text spilling off the screen</li>
        <li>navigate the whole service using just a keyboard</li>
        <li>use the service with a screen reader such as NVDA, JAWS or VoiceOver</li>
        <li>use the service with JavaScript turned off</li>
        <li>change colours, contrast levels and fonts using your browser or device settings</li>
      </ul>

      <h2 className="text-2xl font-bold">Compliance status</h2>
      <p>
        The service is built to meet the Web Content Accessibility Guidelines (WCAG) version 2.2 AA
        standard. Every page is checked automatically with axe-core on each change, and the main
        journeys are tested with a keyboard.
      </p>

      <h2 className="text-2xl font-bold">How the service is designed</h2>
      <ul className="list-disc space-y-1 pl-6">
        <li>one question, or one group of related questions, per page</li>
        <li>an error summary at the top of the page that links to each problem</li>
        <li>labels, hints and errors announced together for every field</li>
        <li>no timeouts while you fill in the form, and answers saved after each page</li>
        <li>status messages announced to screen readers</li>
      </ul>

      <h2 className="text-2xl font-bold">Known limitations</h2>
      <p>
        This is a portfolio project and has not had a manual audit by an accessibility specialist or
        testing with disabled users. Automated tools find only some types of problem.
      </p>

      <h2 className="text-2xl font-bold">Reporting problems</h2>
      <p>
        If you find a problem, open an issue on the project&apos;s GitHub repository. This statement
        was prepared on 24 November 2026.
      </p>
    </article>
  );
}

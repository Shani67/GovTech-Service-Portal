import Link from "next/link";

export default function NotFound() {
  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-4xl font-bold">Page not found</h1>
      <p>If you typed the web address, check it is correct.</p>
      <p>If you pasted the web address, check you copied the entire address.</p>
      <p>
        <Link href="/" className="link">
          Go to the start page
        </Link>
      </p>
    </div>
  );
}

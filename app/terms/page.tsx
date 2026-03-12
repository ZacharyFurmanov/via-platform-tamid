import Link from "next/link";

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[#f7f6f3]">
      <div className="max-w-3xl mx-auto px-6 py-20 sm:py-28">
        {/* Header */}
        <div className="mb-16">
          <p className="text-xs uppercase tracking-[0.25em] text-gray-500 mb-4">
            Legal
          </p>
          <h1 className="text-4xl sm:text-5xl font-serif mb-4">
            Terms &amp; Conditions
          </h1>
          <p className="text-sm text-gray-500">
            Last updated: February 13, 2026
          </p>
        </div>

        {/* Content */}
        <div className="space-y-12 text-gray-700 leading-relaxed">
          <section>
            <h2 className="text-2xl font-serif mb-4 text-black">
              1. Agreement to Terms
            </h2>
            <p>
              By accessing or using the VYA Platform website at vyaplatform.com
              (the &ldquo;Service&rdquo;), you agree to be bound by these Terms &amp;
              Conditions (&ldquo;Terms&rdquo;). If you disagree with any part of these
              terms, you may not access the Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-serif mb-4 text-black">
              2. Description of Service
            </h2>
            <p>
              VYA is a marketplace that connects shoppers with independent
              vintage and secondhand stores across the United States. We aggregate and
              display product listings from partner stores, allowing users to
              browse, discover, and purchase items. VYA does not directly sell
              products; purchases are completed through our partner stores.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-serif mb-4 text-black">
              3. Use of the Service
            </h2>
            <p className="mb-3">You agree to use the Service only for lawful purposes and in accordance with these Terms. You agree not to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Use the Service in any way that violates any applicable federal, state, local, or international law or regulation.</li>
              <li>Attempt to gain unauthorized access to any portion of the Service, other accounts, computer systems, or networks connected to the Service.</li>
              <li>Use any automated system, including robots, spiders, or scrapers, to access the Service for any purpose without our express written permission.</li>
              <li>Introduce any viruses, Trojan horses, worms, or other material that is malicious or technologically harmful.</li>
              <li>Impersonate or attempt to impersonate VYA, a VYA employee, another user, or any other person or entity.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-serif mb-4 text-black">
              4. Accounts
            </h2>
            <p>
              When you create an account with us, you must provide accurate,
              complete, and current information. Failure to do so constitutes a
              breach of the Terms, which may result in immediate termination of
              your account. You are responsible for safeguarding the password
              and for all activities that occur under your account.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-serif mb-4 text-black">
              5. Email Communications
            </h2>
            <p className="mb-3">
              By creating an account, you consent to receive the following types
              of email communications from VYA:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Transactional emails</strong> — sign-in links, order
                notifications, and other messages required for account
                functionality. These cannot be opted out of while your account
                is active.
              </li>
              <li>
                <strong>Marketing and promotional emails</strong> — updates
                about new stores, products, features, and picks. You
                can unsubscribe from these at any time via your account
                settings or the unsubscribe link included in each email.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-serif mb-4 text-black">
              6. Products and Purchases
            </h2>
            <p className="mb-3">
              VYA acts as an intermediary platform connecting buyers with
              independent seller stores. Please note:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>All products listed on VYA are sold by independent partner stores, not by VYA directly.</li>
              <li>Product descriptions, images, pricing, and availability are provided by partner stores and may be subject to change without notice.</li>
              <li>VYA does not guarantee the accuracy, completeness, or reliability of any product listings.</li>
              <li>Returns, exchanges, and refund policies are determined by each individual partner store.</li>
              <li>VYA is not responsible for the quality, safety, legality, or any other aspect of items sold by partner stores.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-serif mb-4 text-black">
              7. Intellectual Property
            </h2>
            <p>
              The Service and its original content, features, and functionality
              are and will remain the exclusive property of VYA Platform and its
              licensors. The Service is protected by copyright, trademark, and
              other laws. Our trademarks and trade dress may not be used in
              connection with any product or service without the prior written
              consent of VYA Platform.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-serif mb-4 text-black">
              8. User-Generated Content
            </h2>
            <p>
              By submitting content to the Service, including but not limited to
              quiz responses, taste profiles, and shared links, you grant VYA a
              non-exclusive, worldwide, royalty-free license to use, reproduce,
              modify, and display such content in connection with the Service.
              You represent that you own or have the necessary rights to submit
              such content.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-serif mb-4 text-black">
              9. Third-Party Links
            </h2>
            <p>
              Our Service may contain links to third-party websites or services
              that are not owned or controlled by VYA. VYA has no control over,
              and assumes no responsibility for, the content, privacy policies,
              or practices of any third-party websites or services. You
              acknowledge and agree that VYA shall not be responsible or liable
              for any damage or loss caused by the use of any such content,
              goods, or services.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-serif mb-4 text-black">
              10. Disclaimer of Warranties
            </h2>
            <p>
              The Service is provided on an &ldquo;AS IS&rdquo; and &ldquo;AS
              AVAILABLE&rdquo; basis, without any warranties of any kind, either
              express or implied, including but not limited to implied warranties
              of merchantability, fitness for a particular purpose,
              non-infringement, or course of performance. VYA does not warrant
              that the Service will function uninterrupted, secure, or available
              at any particular time or location.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-serif mb-4 text-black">
              11. Limitation of Liability
            </h2>
            <p>
              In no event shall VYA Platform, nor its directors, employees,
              partners, agents, suppliers, or affiliates, be liable for any
              indirect, incidental, special, consequential, or punitive damages,
              including without limitation, loss of profits, data, use, goodwill,
              or other intangible losses, resulting from your access to or use of
              or inability to access or use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-serif mb-4 text-black">
              12. Indemnification
            </h2>
            <p>
              You agree to defend, indemnify, and hold harmless VYA Platform and
              its licensees, licensors, employees, contractors, agents, officers,
              and directors from and against any and all claims, damages,
              obligations, losses, liabilities, costs, or debt arising from your
              use of and access to the Service, or your violation of these Terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-serif mb-4 text-black">
              13. Governing Law
            </h2>
            <p>
              These Terms shall be governed and construed in accordance with the
              laws of Delaware, USA, without regard to its conflict of law
              provisions. Our failure to enforce any right or provision of these
              Terms will not be considered a waiver of those rights.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-serif mb-4 text-black">
              14. Changes to Terms
            </h2>
            <p className="mb-3">
              VYA reserves the sole right to modify these Terms at any time, without prior notice, and at its sole discretion. The date of the last modification will be posted at the beginning of these Terms. By continuing to access or use these Services, you agree to be bound by these Terms as modified. It is your sole responsibility to check for updates to these Terms.
            </p>
            <p>
              Any modifications to these Terms or other communications required or permitted hereunder will be given in writing either through the email you provide to VYA or a posting to VYA&apos;s website:{" "}
              <a href="https://vyaplatform.com/" className="text-black underline hover:no-underline">
                https://vyaplatform.com/
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-serif mb-4 text-black">
              15. Contact Us
            </h2>
            <p>
              If you have any questions about these Terms, please contact us at{" "}
              <a
                href="mailto:hana@theviaplatform.com"
                className="text-black underline hover:no-underline"
              >
                hana@theviaplatform.com
              </a>
              .
            </p>
          </section>
        </div>

        {/* Back link */}
        <div className="mt-16 pt-8 border-t border-gray-200">
          <Link
            href="/"
            className="text-sm text-gray-500 hover:text-black transition"
          >
            ← Back to VYA
          </Link>
        </div>
      </div>
    </main>
  );
}

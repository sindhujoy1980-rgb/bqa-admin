export const metadata = {
  title: 'Privacy Policy – Bible Quiz Daily',
  description: 'Privacy Policy for Bible Quiz Daily WhatsApp service by CyFam Parish.',
};

export default function PrivacyPolicyPage() {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'Georgia, serif', background: '#f9f7f4', color: '#1a1a1a' }}>
        <div style={{ maxWidth: 760, margin: '0 auto', padding: '48px 24px 80px' }}>

          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>✝️</div>
            <h1 style={{ fontSize: 28, fontWeight: 700, color: '#1a1a1a', margin: '0 0 8px' }}>
              Privacy Policy
            </h1>
            <p style={{ fontSize: 15, color: '#666', margin: 0 }}>
              Bible Quiz Daily &nbsp;·&nbsp; CyFam Parish
            </p>
            <p style={{ fontSize: 13, color: '#999', marginTop: 6 }}>
              Last updated: July 3, 2026
            </p>
          </div>

          <div style={{ lineHeight: 1.8, fontSize: 15 }}>

            <Section title="1. Introduction">
              <p>
                Welcome to <strong>Bible Quiz Daily</strong>, a WhatsApp-based daily Bible quiz service
                operated by <strong>CyFam Parish</strong>. This Privacy Policy explains how we collect,
                use, and protect your personal information when you use our service.
              </p>
              <p>
                By using Bible Quiz Daily, you agree to the collection and use of information in
                accordance with this policy.
              </p>
            </Section>

            <Section title="2. Information We Collect">
              <p>We collect the following information when you register or interact with our service:</p>
              <ul>
                <li><strong>Name</strong> — your first and last name as provided during registration.</li>
                <li><strong>WhatsApp Phone Number</strong> — used to send quiz messages and receive your answers.</li>
                <li><strong>Quiz Responses</strong> — your answers to daily Bible quiz questions.</li>
                <li><strong>Language Preference</strong> — the language you prefer for quiz content (e.g., Hindi, English).</li>
                <li><strong>Participation Date &amp; Score</strong> — records of when you participated and your results.</li>
              </ul>
              <p>We do <strong>not</strong> collect financial information, location data, or any sensitive personal data.</p>
            </Section>

            <Section title="3. How We Use Your Information">
              <p>Your information is used solely for the following purposes:</p>
              <ul>
                <li>Sending daily Bible quiz questions to your WhatsApp number.</li>
                <li>Processing your quiz responses and recording your scores.</li>
                <li>Generating leaderboards and participation statistics for the parish community.</li>
                <li>Communicating service updates or important announcements.</li>
              </ul>
              <p>We do <strong>not</strong> sell, rent, or share your personal information with third parties for marketing purposes.</p>
            </Section>

            <Section title="4. WhatsApp Messaging">
              <p>
                Our service uses the <strong>WhatsApp Business API</strong> (provided by Meta Platforms, Inc.)
                to send and receive messages. By participating in Bible Quiz Daily via WhatsApp, you also
                agree to WhatsApp's{' '}
                <a href="https://www.whatsapp.com/legal/terms-of-service" style={{ color: '#7c3aed' }}>
                  Terms of Service
                </a>{' '}
                and{' '}
                <a href="https://www.whatsapp.com/legal/privacy-policy" style={{ color: '#7c3aed' }}>
                  Privacy Policy
                </a>.
              </p>
              <p>
                Messages are only sent to users who have voluntarily registered for the service.
                You may opt out at any time by contacting the parish administrator.
              </p>
            </Section>

            <Section title="5. Data Storage &amp; Security">
              <p>
                Your data is stored securely using <strong>Supabase</strong>, a cloud database platform
                with industry-standard encryption at rest and in transit (TLS/SSL). We implement
                appropriate technical and organisational measures to protect your personal data
                against unauthorised access, alteration, or disclosure.
              </p>
              <p>
                Access to the admin system is protected by authentication and is limited to authorised
                parish administrators only.
              </p>
            </Section>

            <Section title="6. Data Retention">
              <p>
                We retain your personal information for as long as you are an active participant
                in the quiz service. If you request removal, your data will be deleted within
                <strong> 30 days</strong> of your request.
              </p>
            </Section>

            <Section title="7. Your Rights">
              <p>You have the right to:</p>
              <ul>
                <li><strong>Access</strong> the personal data we hold about you.</li>
                <li><strong>Correct</strong> any inaccurate information.</li>
                <li><strong>Delete</strong> your account and all associated data.</li>
                <li><strong>Opt out</strong> of receiving WhatsApp quiz messages at any time.</li>
              </ul>
              <p>
                To exercise any of these rights, please contact the parish administrator directly.
              </p>
            </Section>

            <Section title="8. Third-Party Services">
              <p>We use the following third-party services to operate Bible Quiz Daily:</p>
              <ul>
                <li><strong>Meta / WhatsApp Business API</strong> — for message delivery.</li>
                <li><strong>Supabase</strong> — for secure data storage.</li>
                <li><strong>Google Gemini AI</strong> — for generating quiz questions based on Catholic liturgical readings.</li>
                <li><strong>Vercel</strong> — for hosting the backend and admin services.</li>
              </ul>
              <p>Each of these services has its own privacy policy governing their use of data.</p>
            </Section>

            <Section title="9. Children's Privacy">
              <p>
                Our service is intended for parish community members. We do not knowingly collect
                personal information from children under the age of 13 without parental consent.
              </p>
            </Section>

            <Section title="10. Changes to This Policy">
              <p>
                We may update this Privacy Policy from time to time. Any changes will be posted
                on this page with an updated revision date. Continued use of the service after
                changes constitutes acceptance of the updated policy.
              </p>
            </Section>

            <Section title="11. Contact Us">
              <p>
                If you have any questions about this Privacy Policy or how your data is handled,
                please contact the parish administrator:
              </p>
              <div style={{ background: '#f0ebe8', borderRadius: 8, padding: '16px 20px', marginTop: 8 }}>
                <strong>CyFam Parish — Bible Quiz Daily</strong><br />
                WhatsApp: <a href="https://wa.me/919993612014" style={{ color: '#7c3aed' }}>+91 99936 12014</a>
              </div>
            </Section>

          </div>

          <div style={{ marginTop: 48, paddingTop: 24, borderTop: '1px solid #ddd', textAlign: 'center', color: '#999', fontSize: 13 }}>
            © 2026 CyFam Parish · Bible Quiz Daily · All rights reserved
          </div>
        </div>
      </body>
    </html>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 32 }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1a1a1a', marginBottom: 10, borderBottom: '2px solid #e8e0d8', paddingBottom: 6 }}>
        {title}
      </h2>
      <div style={{ color: '#333' }}>{children}</div>
    </div>
  );
}

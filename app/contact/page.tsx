import { FAQPageJsonLd } from '@/components/SchemaOrg';
import { CORE_TRANSLATIONS } from '@/lib/i18n';
import ContactClient from './ContactClient';

// FAQ structured data is emitted server-side in the default (English) locale
// for search engines; the visible page switches locale client-side.
const en = CORE_TRANSLATIONS.en as Record<string, string>;
const FAQ_ITEMS = [
  { question: en.contactQ1, answer: en.contactA1 },
  { question: en.contactQ2, answer: en.contactA2 },
  { question: en.contactQ3, answer: en.contactA3 },
  { question: en.contactQ4, answer: en.contactA4 },
];

export default function ContactPage() {
  return (
    <>
      <FAQPageJsonLd items={FAQ_ITEMS} />
      <ContactClient />
    </>
  );
}

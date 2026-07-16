import { PageHeader } from "@/components/layout/page-header";
import { FaqList } from "@/components/faq/faq-list";

export default function FaqPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader titleKey="page.faq.title" descriptionKey="page.faq.desc" />
      <FaqList />
    </div>
  );
}

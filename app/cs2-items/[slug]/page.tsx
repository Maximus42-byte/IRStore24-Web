export default async function CS2ItemPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <section>
      <h1>جزئیات آیتم CS2</h1>
      <p>Slug: {slug}</p>
    </section>
  );
}

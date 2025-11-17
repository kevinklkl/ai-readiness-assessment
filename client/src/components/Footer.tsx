export default function Footer() {
  return (
    <footer className="border-t bg-card mt-12">
      <div className="container py-8">
        <div className="flex items-center justify-center gap-8">
          <img
            src="/corresbondsvg.svg"
            alt="Coresbond"
            className="h-12 object-contain self-center block"
          />
          <img
            src="/criterionsvg.svg"
            alt="Criterion"
            className="h-12 object-contain self-center block transform -translate-y-1"
          />
          <p className="text-sm text-muted-foreground">
            This project was made by Criterion.
          </p>
        </div>
      </div>
    </footer>
  );
}

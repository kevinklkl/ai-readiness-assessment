export default function Footer() {
  return (
    <footer className="border-t bg-card mt-12">
      <div className="container py-8">
        <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:justify-center sm:gap-8 sm:text-left">
          <img
            src="/corresbondsvg.svg"
            alt="Coresbond"
            className="h-12 object-contain self-center"
          />
          <img
            src="/criterionsvg.svg"
            alt="Criterion"
            className="h-12 object-contain self-center transform sm:-translate-y-1"
          />
          <p className="text-sm text-muted-foreground text-center sm:text-left">
            This project was made by Criterion.
          </p>
        </div>
      </div>
    </footer>
  );
}

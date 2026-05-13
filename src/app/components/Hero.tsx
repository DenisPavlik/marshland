import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMagnifyingGlass } from "@fortawesome/free-solid-svg-icons";

export default function Hero({ defaultQuery = "" }: { defaultQuery?: string }) {
  return (
    <section className="relative overflow-hidden pt-20 pb-10 sm:pb-24">
      <div
        aria-hidden
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-[600px] rounded-full bg-swamp-500/8 blur-3xl pointer-events-none"
      />

      <div className="container relative text-center max-w-3xl">
        <div className="opacity-0 animate-fade-up [animation-delay:50ms]">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full font-mono text-xs text-swamp-700 bg-swamp-50 ring-1 ring-swamp-100">
            <span className="size-1.5 rounded-full bg-swamp-500" />
            now hiring — quietly
          </span>
        </div>

        <h1 className="mt-8 font-serif text-5xl sm:text-6xl md:text-7xl leading-[1.05] sm:leading-[0.95] tracking-tight opacity-0 animate-fade-up [animation-delay:150ms]">
          <span className="text-gray-900">Find your next</span>
          <br />
          <span className="italic text-gradient-swamp">quiet ambition.</span>
        </h1>

        <p className="mt-6 text-gray-500 text-lg max-w-xl mx-auto opacity-0 animate-fade-up [animation-delay:250ms]">
          A focused job board for engineers who care about craft. No noise, no
          spam — just roles worth your time.
        </p>

        <form
          action="/jobs"
          method="GET"
          className="mt-10 flex items-center gap-2 max-w-md mx-auto opacity-0 animate-fade-up [animation-delay:350ms]"
        >
          <div className="relative flex-1">
            <FontAwesomeIcon
              icon={faMagnifyingGlass}
              className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-gray-400 pointer-events-none"
            />
            <input
              type="search"
              name="q"
              defaultValue={defaultQuery}
              placeholder="Search by title, skill, company…"
              aria-label="Search jobs"
              className="input-base pl-11 focus:shadow-[0_0_0_6px_rgba(74,124,89,0.10)] focus:ring-swamp-500/60 transition-shadow duration-300"
            />
          </div>
          <button type="submit" className="btn-primary whitespace-nowrap">
            Search
          </button>
        </form>
      </div>
    </section>
  );
}

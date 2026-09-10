import re

with open("src/components/LiveBoard.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# 1. Let's insert the refs and the scroll useEffect
tv_states_pattern = "  const [tvLanePageIdx, setTvLanePageIdx] = useState<number>(0);"
scroll_refs_code = """  const [tvLanePageIdx, setTvLanePageIdx] = useState<number>(0);

  const scrollRef2 = useRef<HTMLDivElement>(null);
  const scrollRef3 = useRef<HTMLDivElement>(null);
  const scrollRef4 = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isTvMode || isTvPaused) return;

    let activeRef: React.RefObject<HTMLDivElement | null>;
    let durationSeconds = 10;
    if (tvSlideIdx === 2) {
      activeRef = scrollRef2;
      durationSeconds = 20;
    } else if (tvSlideIdx === 3) {
      activeRef = scrollRef3;
      durationSeconds = 10;
    } else if (tvSlideIdx === 4) {
      activeRef = scrollRef4;
      durationSeconds = 10;
    } else {
      return;
    }

    const el = activeRef.current;
    if (!el) return;

    el.scrollTop = 0;

    let frameId: number;
    let startTime: number | null = null;
    const durationMs = durationSeconds * 1000;
    const delayMs = 1500;
    const scrollDurationMs = Math.max(1000, durationMs - 3000);

    const scrollStep = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;

      if (elapsed > delayMs) {
        const scrollElapsed = elapsed - delayMs;
        const progress = Math.min(1, scrollElapsed / scrollDurationMs);
        const maxScroll = el.scrollHeight - el.clientHeight;
        
        if (maxScroll > 0) {
          el.scrollTop = progress * maxScroll;
        }
      }

      if (elapsed < durationMs) {
        frameId = requestAnimationFrame(scrollStep);
      }
    };

    frameId = requestAnimationFrame(scrollStep);
    return () => cancelAnimationFrame(frameId);
  }, [isTvMode, isTvPaused, tvSlideIdx]);"""

if tv_states_pattern in content:
    content = content.replace(tv_states_pattern, scroll_refs_code)
    print("Refs & scroll useEffect inserted successfully.")
else:
    print("ERROR: tv_states_pattern not found!")
    exit(1)

# 2. Replace the auto-rotation timer
timer_pattern = """  // TV Slides Auto-Rotation & Multi-Lane Paging Timer
  useEffect(() => {
    if (!isTvMode || isTvPaused) return;
    const timer = setInterval(() => {
      setTvSlideSecondsRemaining((prev) => {
        // Calculate lane pagination dynamically based on active slide
        let lanesToPage: any[] = [];
        if (tvSlideIdx === 2) lanesToPage = currentGroup1Lanes;
        else if (tvSlideIdx === 3) lanesToPage = currentGroup2Lanes;
        else if (tvSlideIdx === 4) lanesToPage = currentGroup3Lanes;
        const totalPages = lanesToPage.length > 0 ? Math.ceil(lanesToPage.length / 6) : 1;
        if (totalPages > 1) {
          const secondsPerPage = tvSlideIdx === 2 ? 10 : 5;
          // Rotate pages at intervals
          if (prev % secondsPerPage === 0 && prev !== getTvSlideDuration(tvSlideIdx)) {
            setTvLanePageIdx((p) => (p + 1) % totalPages);
          }
        } else {
          setTvLanePageIdx(0);
        }
        if (prev <= 1) {
          const nextIdx = (tvSlideIdx + 1) % 5;
          setTvSlideIdx(nextIdx);
          setTvLanePageIdx(0);
          return getTvSlideDuration(nextIdx);
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isTvMode, isTvPaused, tvSlideIdx, currentGroup1Lanes, currentGroup2Lanes, currentGroup3Lanes]);"""

new_timer_code = """  // TV Slides Auto-Rotation Timer
  useEffect(() => {
    if (!isTvMode || isTvPaused) return;
    const timer = setInterval(() => {
      setTvSlideSecondsRemaining((prev) => {
        if (prev <= 1) {
          const nextIdx = (tvSlideIdx + 1) % 5;
          setTvSlideIdx(nextIdx);
          setTvLanePageIdx(0);
          return getTvSlideDuration(nextIdx);
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isTvMode, isTvPaused, tvSlideIdx]);"""

if timer_pattern in content:
    content = content.replace(timer_pattern, new_timer_code)
    print("Auto-rotation timer updated successfully.")
else:
    # Let's search with relaxed spaces if exact match fails
    print("ERROR: timer_pattern not found exactly!")
    exit(1)

# 3. Add <style> element at the start of TV container
tv_container_start = "  if (isTvMode) {\n    return (\n      <div className=\"fixed inset-0 z-50 bg-[#030712] text-white flex flex-col justify-between font-sans select-none overflow-hidden p-8 animate-fadeIn\" id=\"live-board-tv-backdrop\">"
tv_container_replacement = """  if (isTvMode) {
    return (
      <div className="fixed inset-0 z-50 bg-[#030712] text-white flex flex-col justify-between font-sans select-none overflow-hidden p-8 animate-fadeIn" id="live-board-tv-backdrop">
        <style>{`
          .scrollbar-none::-webkit-scrollbar {
            display: none;
          }
          .scrollbar-none {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
        `}</style>"""

if tv_container_start in content:
    content = content.replace(tv_container_start, tv_container_replacement)
    print("<style> inserted successfully.")
else:
    print("ERROR: tv_container_start not found!")
    exit(1)

# 4. Slide 1 SBD replacement
slide1_sbd = """                        <span className="text-xs text-slate-450 font-mono font-black">
                          SBD: {sbd ? String(sbd).padStart(3, "0") : "---"}
                        </span>"""
slide1_sbd_replacement = """                        <span className="text-xs text-slate-450 font-mono font-black">
                          ID: {item.id?.replace("ath-", "") || "---"}
                        </span>"""

if slide1_sbd in content:
    content = content.replace(slide1_sbd, slide1_sbd_replacement)
    print("Slide 1 SBD replaced.")
else:
    print("ERROR: slide1_sbd not found!")
    exit(1)

with open("src/components/LiveBoard.tsx", "w", encoding="utf-8") as f:
    f.write(content)
print("SBD / ID replacements and timer changes done.")

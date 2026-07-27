export const scrollToTopRobust = (delay = 150) => {
  setTimeout(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    document.documentElement?.scrollTo({ top: 0, behavior: "smooth" });
    document.body?.scrollTo({ top: 0, behavior: "smooth" });
    const mainContent = document.querySelector("main");
    if (mainContent) {
      mainContent.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, delay);
};

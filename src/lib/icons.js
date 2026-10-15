/** WHAT: Maps icon names to 16x16 SVG path data. WHY: Keeps every icon shape in one place. */
export const icons = {
  transcript: 'M2 3h12v2H2V3zm0 4h12v2H2V7zm0 4h8v2H2v-2z',
  clock: 'M8 1a7 7 0 100 14A7 7 0 008 1zm0 12.5A5.5 5.5 0 118 2.5a5.5 5.5 0 010 11zM8 4v4.5l3 1.5-.6 1.1L6.5 9V4H8z',
  // A lightning bolt: "automatic", unlike a circular arrow that reads as "reload".
  autoload: 'M9.4 1L3 9h4.3L6.6 15 13 7H8.7L9.4 1z',
  chevronDown: 'M8 10l-4-4h8l-4 4z',
  close: 'M4.646 4.646a.5.5 0 01.708 0L8 7.293l2.646-2.647a.5.5 0 01.708.708L8.707 8l2.647 2.646a.5.5 0 01-.708.708L8 8.707l-2.646 2.647a.5.5 0 01-.708-.708L7.293 8 4.646 5.354a.5.5 0 010-.708z',
  search: 'M11.742 10.344a6.5 6.5 0 10-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 001.415-1.414l-3.85-3.85a1.007 1.007 0 00-.115-.1zM12 6.5a5.5 5.5 0 11-11 0 5.5 5.5 0 0111 0z',
  clearCircle: 'M8 0a8 8 0 100 16A8 8 0 008 0zM5.354 4.646L8 7.293l2.646-2.647a.5.5 0 01.708.708L8.707 8l2.647 2.646a.5.5 0 01-.708.708L8 8.707l-2.646 2.647a.5.5 0 01-.708-.708L7.293 8 4.646 5.354a.5.5 0 01.708-.708z',
  // Text view: a ragged paragraph, distinct from the panel's transcript icon.
  text: 'M2 3h12v1.5H2V3zm0 3h9v1.5H2V6zm0 3h12v1.5H2V9zm0 3h7v1.5H2V12z',
  // Timeline view: time stamps beside lines.
  chips: 'M1 3h3v1.5H1V3zm5 0h9v1.5H6V3zM1 7.25h3v1.5H1v-1.5zm5 0h7v1.5H6v-1.5zM1 11.5h3V13H1v-1.5zm5 0h9V13H6v-1.5z',
  copy: 'M4 2a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H6a2 2 0 01-2-2V2zm2-1a1 1 0 00-1 1v8a1 1 0 001 1h8a1 1 0 001-1V2a1 1 0 00-1-1H6zM2 5a1 1 0 00-1 1v8a1 1 0 001 1h8a1 1 0 001-1v-1h1v1a2 2 0 01-2 2H2a2 2 0 01-2-2V6a2 2 0 012-2h1v1H2z',
  download: 'M8 12l-4-4h2.5V3h3v5H12l-4 4zm-6 1h12v2H2v-2z',
  check: 'M13.78 3.97a.75.75 0 010 1.06l-7 7a.75.75 0 01-1.06 0l-3.5-3.5a.75.75 0 111.06-1.06L6.25 10.44l6.47-6.47a.75.75 0 011.06 0z',
};

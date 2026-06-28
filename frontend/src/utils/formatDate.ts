export const formatDDMonYYYY = (date: Date): string => {
  const day = String(date.getDate()).padStart(2, '0');
  const month = date.toLocaleDateString('en-US', { month: 'long' });
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
};

const YYYY_MM_DD = /^(\d{4})-(\d{2})-(\d{2})$/;

export const displayDate = (value: string | undefined | null): string => {
  if (!value) return '';
  const match = value.match(YYYY_MM_DD);
  if (match) {
    const [_, y, m, d] = match;
    const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const month = months[parseInt(m) - 1];
    return `${d}-${month}-${y}`;
  }
  return value;
};

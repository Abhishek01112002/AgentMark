import toast from 'react-hot-toast';

export function stripMarkdown(markdown: string): string {
  if (!markdown) return '';
  return markdown
    .replace(/^#+\s+/gm, '')           // Remove headings
    .replace(/\*\*(.*?)\*\*/g, '$1')   // Remove bold
    .replace(/\*(.*?)\*/g, '$1')       // Remove italics
    .replace(/__(.*?)__/g, '$1')       // Remove underline/bold
    .replace(/_(.*?)_/g, '$1')         // Remove underline/italics
    .replace(/`([^`]+)`/g, '$1')       // Remove inline code
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove links
    .replace(/^\s*[-*+]\s+/gm, '')     // Remove bullet lists
    .trim();
}

export async function copyAsPlainText(text: string, successMessage = 'Copied as Plain Text!'): Promise<boolean> {
  try {
    const plain = stripMarkdown(text);
    await navigator.clipboard.writeText(plain);
    toast.success(successMessage);
    return true;
  } catch (err) {
    console.error('Failed to copy plain text:', err);
    toast.error('Failed to copy text');
    return false;
  }
}

export async function copyAsMarkdown(text: string, successMessage = 'Copied as Markdown!'): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(successMessage);
    return true;
  } catch (err) {
    console.error('Failed to copy markdown:', err);
    toast.error('Failed to copy text');
    return false;
  }
}

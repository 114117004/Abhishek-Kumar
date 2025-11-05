// src/lib/showToast.ts
// Simple DOM-based toast — safe to call from client-side only.
// Usage: import { showToast } from '@/lib/showToast'; showToast('Saved', 3000);

export function showToast(message: string, duration = 3000) {
  if (typeof document === 'undefined') return;

  const id = 'app-global-toast';
  let toast = document.getElementById(id) as HTMLDivElement | null;

  if (!toast) {
    toast = document.createElement('div');
    toast.id = id;
    toast.style.position = 'fixed';
    toast.style.right = '20px';
    toast.style.bottom = '24px';
    toast.style.zIndex = '99999';
    toast.style.padding = '10px 14px';
    toast.style.borderRadius = '10px';
    toast.style.boxShadow = '0 6px 18px rgba(0,0,0,0.12)';
    toast.style.maxWidth = '90%';
    toast.style.fontSize = '14px';
    toast.style.backdropFilter = 'blur(2px)';
    toast.style.transition = 'opacity 260ms ease, transform 260ms ease';
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(8px)';
    document.body.appendChild(toast);
  }

  toast.textContent = message;
  // show
  requestAnimationFrame(() => {
    toast!.style.opacity = '1';
    toast!.style.transform = 'translateY(0)';
    toast!.style.background = '#111';
    toast!.style.color = '#fff';
  });

  // hide after duration
  window.setTimeout(() => {
    if (!toast) return;
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(8px)';
  }, duration);

  // remove after animation (extra safety)
  window.setTimeout(() => {
    try { if (toast && toast.parentNode) toast.parentNode.removeChild(toast); } catch(e) {}
  }, duration + 400);
}

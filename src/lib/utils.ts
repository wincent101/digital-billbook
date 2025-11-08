import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * แปลง image element เป็น base64 data URL โดยใช้ canvas
 * วิธีนี้ช่วยให้ html2canvas สามารถจับภาพ QR code ได้อย่างถูกต้อง
 */
export async function convertImageToBase64(img: HTMLImageElement): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error('Cannot get canvas context'));
        return;
      }

      ctx.drawImage(img, 0, 0);
      const dataURL = canvas.toDataURL('image/png');
      resolve(dataURL);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * แปลง QR code images ทั้งหมดใน element เป็น base64 ก่อนที่จะใช้ html2canvas
 * วิธีนี้แก้ปัญหา QR code ไม่แสดงในรูปที่โหลดลงมา
 */
export async function convertQRImagesToBase64(element: HTMLElement): Promise<void> {
  const images = element.querySelectorAll('img');
  const promises = Array.from(images).map(async (img) => {
    try {
      // รอให้ image โหลดเสร็จก่อน (ถ้ายังไม่เสร็จ)
      if (!img.complete) {
        await new Promise((resolve) => {
          img.onload = resolve;
          img.onerror = resolve;
        });
      }

      // แปลงเป็น base64
      const base64 = await convertImageToBase64(img);
      img.src = base64;
    } catch (error) {
      console.error('Error converting image to base64:', error);
    }
  });
  
  await Promise.all(promises);
}

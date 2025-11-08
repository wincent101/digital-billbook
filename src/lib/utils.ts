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
  console.log(`Found ${images.length} images to convert`);
  
  for (const img of Array.from(images)) {
    try {
      // บันทึก src เดิมไว้เพื่อเช็ค
      const originalSrc = img.src;
      console.log(`Converting image: ${originalSrc.substring(0, 50)}...`);
      
      // รอให้ image โหลดเสร็จก่อน (ถ้ายังไม่เสร็จ)
      if (!img.complete) {
        console.log('Image not complete, waiting...');
        await new Promise<void>((resolve) => {
          img.onload = () => {
            console.log('Image loaded');
            resolve();
          };
          img.onerror = () => {
            console.log('Image error, but continuing');
            resolve();
          };
          // Timeout fallback
          setTimeout(() => {
            console.log('Image load timeout');
            resolve();
          }, 5000);
        });
      }

      // ถ้าเป็น data URL อยู่แล้ว และเป็น base64 ก็ข้ามไป
      if (originalSrc.startsWith('data:image')) {
        console.log('Image is already a data URL, skipping conversion');
        continue;
      }

      // แปลงเป็น base64
      console.log('Converting to base64...');
      const base64 = await convertImageToBase64(img);
      img.src = base64;
      
      // ตั้งค่า crossOrigin
      img.crossOrigin = 'anonymous';
      
      console.log(`Conversion complete: ${base64.substring(0, 50)}...`);
    } catch (error) {
      console.error('Error converting image to base64:', error);
    }
  }
  
  console.log('All images converted');
}

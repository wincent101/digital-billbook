import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface DeleteResult {
  fileName: string;
  success: boolean;
  error?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting cleanup of old files...');

    // สร้าง Supabase client ด้วย service role key เพื่อข้าม RLS
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // กำหนดระยะเวลาที่จะเก็บไฟล์ (14 วัน)
    const DAYS_TO_KEEP = 14;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - DAYS_TO_KEEP);
    
    console.log(`Deleting files older than: ${cutoffDate.toISOString()}`);

    // ดึงรายการไฟล์ทั้งหมดจาก bucket
    const { data: files, error: listError } = await supabaseAdmin
      .storage
      .from('invoice-files')
      .list();

    if (listError) {
      console.error('Error listing files:', listError);
      throw listError;
    }

    if (!files || files.length === 0) {
      console.log('No files found in bucket');
      return new Response(
        JSON.stringify({ 
          message: 'No files to cleanup',
          deletedCount: 0 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    console.log(`Found ${files.length} files in bucket`);

    // กรองไฟล์ที่เก่ากว่า 14 วัน
    const oldFiles = files.filter(file => {
      const fileDate = new Date(file.created_at);
      return fileDate < cutoffDate;
    });

    console.log(`Found ${oldFiles.length} files to delete`);

    if (oldFiles.length === 0) {
      return new Response(
        JSON.stringify({ 
          message: 'No old files to cleanup',
          deletedCount: 0,
          totalFiles: files.length
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // ลบไฟล์ที่เก่ากว่า 14 วัน
    const deleteResults: DeleteResult[] = [];
    
    for (const file of oldFiles) {
      try {
        console.log(`Deleting file: ${file.name}`);
        const { error: deleteError } = await supabaseAdmin
          .storage
          .from('invoice-files')
          .remove([file.name]);

        if (deleteError) {
          console.error(`Error deleting ${file.name}:`, deleteError);
          deleteResults.push({
            fileName: file.name,
            success: false,
            error: deleteError.message
          });
        } else {
          console.log(`Successfully deleted: ${file.name}`);
          deleteResults.push({
            fileName: file.name,
            success: true
          });
        }
      } catch (error: any) {
        console.error(`Exception deleting ${file.name}:`, error);
        deleteResults.push({
          fileName: file.name,
          success: false,
          error: error.message || 'Unknown error'
        });
      }
    }

    const successCount = deleteResults.filter(r => r.success).length;
    const failureCount = deleteResults.filter(r => !r.success).length;

    console.log(`Cleanup complete. Deleted: ${successCount}, Failed: ${failureCount}`);

    return new Response(
      JSON.stringify({
        message: 'Cleanup completed',
        deletedCount: successCount,
        failedCount: failureCount,
        totalFilesInBucket: files.length,
        cutoffDate: cutoffDate.toISOString(),
        results: deleteResults
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error: any) {
    console.error('Cleanup error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Unknown error',
        message: 'Failed to cleanup old files'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { getBookmarkById } from '@/lib/supabase/bookmark/selectors';
import { sendEmailWithGmail, testGmailConnection } from '@/lib/email-smtp';

// Email provider configuration
const EMAIL_PROVIDER = process.env.EMAIL_PROVIDER || 'resend'; // 'resend' or 'gmail'

// Initialize Resend client
let resend: Resend | null = null;
try {
  if (process.env.RESEND_API_KEY && EMAIL_PROVIDER === 'resend') {
    resend = new Resend(process.env.RESEND_API_KEY);
  }
} catch (error) {
  console.warn('Failed to initialize Resend client:', error);
}

// Get Supabase client
const getSupabaseClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(supabaseUrl, supabaseKey);
};

/**
 * Calculate days remaining until expiry
 */
function calculateDaysRemaining(endTime: string): number {
  const endDate = new Date(endTime);
  const currentDate = new Date();
  const timeDiff = endDate.getTime() - currentDate.getTime();
  const daysRemaining = Math.ceil(timeDiff / (1000 * 3600 * 24));
  return daysRemaining;
}

/**
 * Format time remaining in human readable format
 */
function formatTimeRemaining(days: number): string {
  if (days <= 0) {
    return 'Expired';
  } else if (days === 1) {
    return '1 day';
  } else if (days < 7) {
    return `${days} days`;
  } else if (days < 30) {
    const weeks = Math.floor(days / 7);
    const remainingDays = days % 7;
    return remainingDays > 0 ? `${weeks} weeks ${remainingDays} days` : `${weeks} weeks`;
  } else {
    const months = Math.floor(days / 30);
    const remainingDays = days % 30;
    return remainingDays > 0 ? `${months} months ${remainingDays} days` : `${months} months`;
  }
}

/**
 * Send reminder email for expiring subscription
 */
interface BookmarkData {
  object_id?: string;
  net_type?: 'testnet' | 'mainnet' | 'unknown';
  remark?: string;
}

async function sendReminderEmail(
  email: string,
  bookmarkData: BookmarkData,
  daysRemaining: number,
  testMode: boolean = false
): Promise<boolean> {
  if (testMode) {
    console.log(`[TEST MODE] 模拟发送提醒邮件到: ${email}`);
    console.log(`[TEST MODE] 书签信息:`, bookmarkData);
    console.log(`[TEST MODE] 剩余时间: ${daysRemaining}天`);
    return true; // Simulate success for testing
  }

  try {
    const timeRemaining = formatTimeRemaining(daysRemaining);
    const redirectUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/main/bookmarks`;
    
    const subject = `Bookmark Subscription Expiration Reminder - ${daysRemaining <= 0 ? 'Expired' : `${timeRemaining} remaining`}`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Bookmark Subscription Expiration Reminder</h2>
        <p>Hello!</p>
        <p>Your bookmark subscription is about to expire, please handle it promptly:</p>
        
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Bookmark Information</h3>
          <p><strong>Object ID:</strong> ${bookmarkData.object_id || 'Unknown'}</p>
          <p><strong>Network Type:</strong> ${bookmarkData.net_type === 'testnet' ? 'Testnet' : 'Mainnet'}</p>
          <p><strong>Remark:</strong> ${bookmarkData.remark || 'None'}</p>
          <p><strong>Time Remaining:</strong> <span style="color: ${daysRemaining <= 0 ? 'red' : daysRemaining <= 3 ? 'orange' : 'green'}">${timeRemaining}</span></p>
        </div>
        
        <p style="text-align: center; margin: 30px 0;">
          <a href="${redirectUrl}" 
             style="background-color: #1890ff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
            View Bookmark Details
          </a>
        </p>
        
        <p style="font-size: 12px; color: #666; border-top: 1px solid #eee; padding-top: 10px;">
          This email was sent automatically, please do not reply directly. For help, please visit our website.
        </p>
      </div>
    `;

    let emailSent = false;
    let usedProvider = EMAIL_PROVIDER;

    // Send email based on configured provider with fallback mechanism
    if (EMAIL_PROVIDER === 'gmail') {
      // Use Gmail SMTP first
      const fromEmail = process.env.GMAIL_USER || process.env.ADMIN_EMAIL;
      emailSent = await sendEmailWithGmail(email, subject, html, fromEmail);
      
      // If Gmail fails and Resend is available, fallback to Resend
      if (!emailSent && resend) {
        console.warn('Gmail SMTP发送失败，尝试使用Resend作为备用方案');
        try {
          const { error } = await resend.emails.send({
            from: process.env.ADMIN_EMAIL ? `Bookmark Reminder <${process.env.ADMIN_EMAIL}>` : 'noreply@yourdomain.com',
            to: email,
            subject,
            html,
          });

          if (!error) {
            emailSent = true;
            usedProvider = 'resend (fallback)';
          } else {
            console.error('Resend备用方案也失败:', error);
          }
        } catch (fallbackError) {
          console.error('Resend备用方案异常:', fallbackError);
        }
      }
    } else if (EMAIL_PROVIDER === 'resend' && resend) {
      // Use Resend
      const { error } = await resend.emails.send({
        from: process.env.ADMIN_EMAIL ? `Bookmark Reminder <${process.env.ADMIN_EMAIL}>` : 'noreply@yourdomain.com',
        to: email,
        subject,
        html,
      });

      if (error) {
        console.error('发送邮件失败:', error);
        // Handle specific Resend errors
        interface ResendError {
          statusCode?: number;
          message?: string;
        }
        const errorObj = error as ResendError;
        if (errorObj.statusCode === 403 && errorObj.message?.includes('domain is not verified')) {
          console.error('邮件发送失败原因: 域名未在Resend验证。请访问 https://resend.com/domains 验证域名');
        }
        return false;
      }
      emailSent = true;
    } else {
      console.warn(`邮件服务未配置或不可用。提供商: ${EMAIL_PROVIDER}, Resend状态: ${resend ? '已初始化' : '未初始化'}`);
      return false;
    }

    if (emailSent) {
      console.log(`成功发送提醒邮件到 ${email} (使用 ${usedProvider})`);
    }
    return emailSent;
  } catch (error) {
    console.error('发送邮件异常:', error);
    return false;
  }
}

/**
 * Update subscription expiry status
 */
async function updateSubscriptionExpiry(subscriptionId: number): Promise<boolean> {
  try {
    const supabase = getSupabaseClient();
    
    const { error } = await supabase
      .from('subscribe')
      .update({ is_expired: true })
      .eq('id', subscriptionId);

    if (error) {
      console.error(`更新订阅 ${subscriptionId} 过期状态失败:`, error);
      return false;
    }

    console.log(`成功更新订阅 ${subscriptionId} 为过期状态`);
    return true;
  } catch (error) {
    console.error(`更新订阅 ${subscriptionId} 过期状态异常:`, error);
    return false;
  }
}

/**
 * Main API handler for email notifications
 */
export async function GET(request: Request) {
  try {
    // Check if email service is configured based on provider
    let emailServiceAvailable = false;
    
    if (EMAIL_PROVIDER === 'gmail') {
      // Test Gmail connection
      emailServiceAvailable = await testGmailConnection();
      if (!emailServiceAvailable) {
        return NextResponse.json(
          { error: 'Gmail SMTP 服务未配置或连接失败，请检查 GMAIL_USER 和 GMAIL_APP_PASSWORD 环境变量' },
          { status: 500 }
        );
      }
    } else if (EMAIL_PROVIDER === 'resend') {
      if (!resend) {
        return NextResponse.json(
          { error: 'Resend 邮件服务未配置，请检查 RESEND_API_KEY 环境变量' },
          { status: 500 }
        );
      }
      emailServiceAvailable = true;
    } else {
      return NextResponse.json(
        { error: `不支持的邮件服务提供商: ${EMAIL_PROVIDER}` },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const advanceDayParam = searchParams.get('advance_day');
    const advanceDay = advanceDayParam ? parseInt(advanceDayParam) : 7; // 默认提前7天
    const testMode = searchParams.get('test_mode') === 'true'; // 测试模式

    console.log(`开始处理邮件通知，提前天数: ${advanceDay}, 测试模式: ${testMode}`);

    // Get Supabase client
    const supabase = getSupabaseClient();

    // Query all non-expired subscriptions
    const { data: subscriptions, error: queryError } = await supabase
      .from('subscribe')
      .select('*')
      .eq('is_expired', false)
      .order('end_time', { ascending: true });

    if (queryError) {
      console.error('查询订阅数据失败:', queryError);
      return NextResponse.json(
        { error: '查询订阅数据失败' },
        { status: 500 }
      );
    }

    console.log('查询到的订阅:', subscriptions);

    if (!subscriptions || subscriptions.length === 0) {
      console.log('没有找到需要处理的订阅');
      return NextResponse.json({
        success: true,
        message: '没有需要处理的订阅',
        processed: 0,
        emails_sent: 0,
        expired: 0
      });
    }

    console.log(`找到 ${subscriptions.length} 个活跃订阅`);

    let emailsSent = 0;
    let subscriptionsExpired = 0;
    let processedCount = 0;

    // Process each subscription
    for (const subscription of subscriptions) {
      try {
        const endTime = new Date(subscription.end_time);
        const daysRemaining = calculateDaysRemaining(subscription.end_time);
        
        // Check if subscription needs reminder or is expired
        const rowAdvanceDay = subscription.advance_day || advanceDay;
        const currentDate = new Date();
        const expiryThreshold = new Date(currentDate.getTime() + rowAdvanceDay * 24 * 60 * 60 * 1000);
        const needsReminder = endTime <= expiryThreshold && daysRemaining >= 0;
        const isExpired = daysRemaining < 0;

        if (needsReminder || isExpired) {
          processedCount++;

          // Get bookmark details
          const bookmarkResult = await getBookmarkById(subscription.bookmark_id);
          let bookmarkData: BookmarkData;
          
          if (bookmarkResult.success && bookmarkResult.data) {
            bookmarkData = {
              object_id: bookmarkResult.data.object_id,
              net_type: bookmarkResult.data.net_type || 'unknown',
              remark: bookmarkResult.data.remark || '无备注'
            };
          } else {
            console.warn(`无法获取书签 ${subscription.bookmark_id} 的详细信息`);
            // Use basic bookmark info from subscription
            bookmarkData = {
              object_id: subscription.bookmark_id,
              net_type: 'unknown',
              remark: '无详细信息'
            };
          }

          // Send reminder email if not expired
          if (needsReminder && !isExpired) {
            const emailSent = await sendReminderEmail(
              subscription.user_email,
              bookmarkData,
              daysRemaining,
              testMode
            );
            
            if (emailSent) {
              emailsSent++;
            }
          }

          // Mark as expired if needed
          if (isExpired) {
            const updated = await updateSubscriptionExpiry(subscription.id);
            if (updated) {
              subscriptionsExpired++;
            }
          }
        }
      } catch (error) {
        console.error(`处理订阅 ${subscription.id} 时出错:`, error);
        // Continue processing other subscriptions
      }
    }

    const result = {
      success: true,
      message: '邮件通知处理完成',
      processed: processedCount,
      emails_sent: emailsSent,
      expired: subscriptionsExpired,
      total_subscriptions: subscriptions.length,
      test_mode: testMode,
      advance_day: advanceDay,
      email_provider: EMAIL_PROVIDER
    };

    console.log('邮件通知处理结果:', result);
    return NextResponse.json(result);

  } catch (error) {
    console.error('处理邮件通知时发生异常:', error);
    return NextResponse.json(
      { error: '处理邮件通知时发生错误' },
      { status: 500 }
    );
  }
}

/**
 * Health check endpoint
 */
export async function OPTIONS() {
  return NextResponse.json({ status: 'ok' });
}
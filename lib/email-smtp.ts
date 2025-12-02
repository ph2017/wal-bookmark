import nodemailer from 'nodemailer';

// Gmail SMTP 配置
let gmailTransporter: nodemailer.Transporter | null = null;

/**
 * 初始化 Gmail SMTP 传输器
 */
export function initGmailTransporter() {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    console.warn('Gmail SMTP 配置缺失，请设置 GMAIL_USER 和 GMAIL_APP_PASSWORD 环境变量');
    return null;
  }

  try {
    // 尝试使用SSL端口465
    gmailTransporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true, // 使用SSL
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD, // 注意：这里需要应用专用密码，不是常规密码
      },
      tls: {
        rejectUnauthorized: false,
        minVersion: 'TLSv1.2',
      },
      connectionTimeout: 30000, // 30秒连接超时
      greetingTimeout: 30000,   // 30秒问候超时
      socketTimeout: 30000,     // 30秒socket超时
      debug: true, // 启用调试模式
      logger: true, // 启用日志记录
    });

    console.log('Gmail SMTP 传输器初始化成功');
    return gmailTransporter;
  } catch (error) {
    console.error('Gmail SMTP 初始化失败:', error);
    return null;
  }
}

/**
 * 使用 Gmail SMTP 发送邮件
 */
export async function sendEmailWithGmail(
  to: string,
  subject: string,
  html: string,
  from?: string
): Promise<boolean> {
  if (!gmailTransporter) {
    gmailTransporter = initGmailTransporter();
  }

  if (!gmailTransporter) {
    console.error('Gmail SMTP 传输器未初始化');
    return false;
  }

  try {
    const mailOptions = {
      from: from || process.env.GMAIL_USER,
      to,
      subject,
      html,
    };

    const result = await gmailTransporter.sendMail(mailOptions);
    console.log(`Gmail 邮件发送成功: ${result.messageId}`);
    return true;
  } catch (error) {
    console.error('Gmail 邮件发送失败:', error);
    return false;
  }
}

/**
 * 测试 Gmail SMTP 连接
 */
export async function testGmailConnection(): Promise<boolean> {
  if (!gmailTransporter) {
    gmailTransporter = initGmailTransporter();
  }

  if (!gmailTransporter) {
    console.error('Gmail SMTP 传输器初始化失败，无法测试连接');
    return false;
  }

  try {
    console.log('正在测试Gmail SMTP连接...');
    await gmailTransporter.verify();
    console.log('Gmail SMTP 连接测试成功');
    return true;
  } catch (error) {
    console.error('Gmail SMTP 连接测试失败:', error);
    
    // 提供更具体的错误信息
    if (error instanceof Error) {
      if (error.message.includes('Invalid login')) {
        console.error('可能的原因：');
        console.error('1. 应用专用密码不正确');
        console.error('2. Gmail账户未启用两步验证');
        console.error('3. 需要访问 https://myaccount.google.com/lesssecureapps 允许不够安全的应用');
      } else if (error.message.includes('ECONNRESET')) {
        console.error('可能的原因：');
        console.error('1. 网络连接问题');
        console.error('2. 防火墙阻止了SMTP连接');
        console.error('3. 尝试使用VPN或检查网络设置');
      }
    }
    
    return false;
  }
}
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

exports.sendEmailOTP = async (email, otp) => {
  const mailOptions = {
    from: `"Civic Report System" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Your Aadhaar Verification OTP',
    text: `Your OTP for Aadhaar verification is: ${otp}\nThis code is valid for 5 minutes.`,
  };

  await transporter.sendMail(mailOptions);
  console.log(`📧 OTP sent to ${email}: ${otp}`);
};

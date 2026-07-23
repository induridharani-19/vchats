import bcrypt from 'bcryptjs';
import User from '../models/User';
import SystemConfig from '../models/SystemConfig';

export const seedAdminsAndConfig = async (): Promise<void> => {
  try {
    const adminEmails = ['vamsivalluri52@gmail.com', 'vamsivalluri53@gmail.com'];
    const adminPassword = 'Vamsi@1912';

    // Hash the password
    const passwordHash = await bcrypt.hash(adminPassword, 12);

    for (const email of adminEmails) {
      const existingUser = await User.findOne({ email });

      if (existingUser) {
        // Update existing user to be verified, admin, and set the password
        existingUser.isAdmin = true;
        existingUser.isVerified = true;
        existingUser.passwordHash = passwordHash;
        await existingUser.save();
        console.log(`Seeder: Updated admin user: ${email}`);
      } else {
        // Create new admin user
        const baseUsername = email.split('@')[0];
        const newUser = await User.create({
          username: baseUsername,
          email,
          passwordHash,
          displayName: baseUsername === 'vamsivalluri52' ? 'Vamsi Admin 52' : 'Vamsi Admin 53',
          isAdmin: true,
          isVerified: true,
          isBlocked: false,
          about: 'System Administrator',
          bio: 'Administrator account for VChats platform management.',
          themePreference: 'dark',
          status: 'offline',
        });
        console.log(`Seeder: Created new admin user: ${email}`);
      }
    }

    // Seed default System Config if not exists
    const configExists = await SystemConfig.findOne();
    if (!configExists) {
      await SystemConfig.create({
        appName: 'VChats',
        appLogo: '',
        accentColor: '#0d9488',
        showAds: false,
        adImageUrl: '',
        adTargetUrl: '',
        adText: '',
        e2eEnforced: true,
        autoDeleteDays: 0,
        allowNewRegistrations: true,
      });
      console.log('Seeder: Default SystemConfig document created.');
    }
  } catch (error) {
    console.error('Seeder: Failed to seed admin accounts and configuration.', error);
  }
};

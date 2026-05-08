import { createClient } from '@base44/sdk';

const base44 = createClient({
  appId: '698c8fe4f23098983e1aa792',
});

async function getTodayUpbo() {
    try {
        const users = await base44.entities.LedgerUser.list();
        const today = new Date('2026-05-01').toISOString().split('T')[0];
        
        const todayUsers = users.filter(u => {
            if (!u.created_at) return false;
            // Only 'upbo' category
            if (u.category !== 'upbo') return false;
            
            const createdAt = new Date(u.created_at).toISOString().split('T')[0];
            return createdAt === today;
        });

        console.log(JSON.stringify(todayUsers, null, 2));
    } catch (error) {
        console.error('Error fetching users:', error);
    }
}

getTodayUpbo();

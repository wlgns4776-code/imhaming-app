import { base44 } from './base44Client';

export const syncCalendarEvents = async (msEvents) => {
    if (!msEvents || !msEvents.value) return 0;

    const currentEvents = await base44.entities.CalendarEvent.list();
    const msEventMap = new Map(msEvents.value.map(e => [e.id, e]));
    
    let addedCount = 0;
    let updatedCount = 0;
    let deletedCount = 0;

    // 1. Handle Updates and New Events
    for (const msEvent of msEvents.value) {
        const title = msEvent.subject;
        const start = msEvent.start.dateTime;
        const end = msEvent.end.dateTime;
        const externalId = msEvent.id;

        const existingEvent = currentEvents.find(e => e.externalId === externalId);

        if (existingEvent) {
            // Check if update is needed
            if (existingEvent.title !== title || 
                existingEvent.start !== start || 
                existingEvent.end !== end) {
                
                await base44.entities.CalendarEvent.update(existingEvent.id, {
                    title,
                    start,
                    end
                });
                updatedCount++;
            }
        } else {
            // Create new
            try {
                // Determine order: find max order for the day
                const dayEvents = currentEvents.filter(e => new Date(e.start).toDateString() === new Date(start).toDateString());
                const maxOrder = dayEvents.length > 0 ? Math.max(...dayEvents.map(e => e.order || 0)) : -1;

                await base44.entities.CalendarEvent.create({
                    title,
                    start,
                    end,
                    order: maxOrder + 1,
                    externalId
                });
                addedCount++;
            } catch (err) {
                console.error("Failed to sync event:", title, err);
            }
        }
    }

    // 2. Handle Deletions
    // Only delete events that have an externalId (i.e., were synced from MS)
    // AND are no longer present in the fetched MS events list.
    for (const event of currentEvents) {
        if (event.externalId && !msEventMap.has(event.externalId)) {
            try {
                await base44.entities.CalendarEvent.delete(event.id);
                deletedCount++;
            } catch (err) {
                 console.error("Failed to delete synced event:", event.title, err);
            }
        }
    }

    console.log(`Sync complete: Added ${addedCount}, Updated ${updatedCount}, Deleted ${deletedCount}`);
    return addedCount + updatedCount + deletedCount;
};

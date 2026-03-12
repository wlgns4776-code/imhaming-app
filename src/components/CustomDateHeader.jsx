import React from 'react';
import { getHolidayName } from '../utils/holidayUtils';

const CustomDateHeader = ({ label, date, onDrillDown }) => {
  const day = date.getDay();
  const holidayName = getHolidayName(date);
  
  // Sundays (0) and Holidays are Red
  const isRedDay = day === 0 || holidayName;
  // Saturdays (6) are Blue (unless it's a holiday, then Red)
  const isBlueDay = day === 6 && !isRedDay;

  const color = isRedDay ? '#ea3a3a' : isBlueDay ? '#3b82f6' : 'inherit';

  return (
    <div className="rbc-date-header-content" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
      <button 
        type="button" 
        className="rbc-button-link" 
        onClick={onDrillDown}
        style={{ color, fontWeight: isRedDay || isBlueDay ? 'bold' : 'normal' }}
      >
        {label}
      </button>
      {holidayName && (
        <span style={{ 
          fontSize: '0.7em', 
          color: '#ea3a3a', 
          marginLeft: '4px',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          maxWidth: '100%'
        }}>
          {holidayName}
        </span>
      )}
    </div>
  );
};

export default CustomDateHeader;

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Screen } from '@/components/Screen';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesome6 } from '@expo/vector-icons';
import { fetchEvents, type EventItem } from '@/utils/api';
import { useSafeRouter } from '@/hooks/useSafeRouter';

const CATEGORY_MAP: Record<string, { label: string; color: string }> = {
  work: { label: '工作', color: '#6C63FF' },
  life: { label: '生活', color: '#00B894' },
  family: { label: '家庭', color: '#FDCB6E' },
};

const PRIORITY_MAP: Record<string, { label: string; color: string }> = {
  high: { label: '高', color: '#FF6B6B' },
  medium: { label: '中', color: '#FDCB6E' },
  low: { label: '低', color: '#00B894' },
};

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];
const MONTHS = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

export default function CalendarScreen() {
  const insets = useSafeAreaInsets();
  const router = useSafeRouter();
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [selectedDate, setSelectedDate] = useState<number>(new Date().getDate());
  const [events, setEvents] = useState<EventItem[]>([]);

  const loadEvents = useCallback(async () => {
    try {
      const data = await fetchEvents();
      setEvents(data);
    } catch (err) {
      console.error('Failed to load events:', err);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadEvents();
    }, [loadEvents])
  );

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth);
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === currentYear && today.getMonth() === currentMonth;

  const getEventsForDay = (day: number): EventItem[] => {
    return events.filter(e => {
      if (!e.remind_time) return false;
      const d = new Date(e.remind_time);
      return d.getFullYear() === currentYear && d.getMonth() === currentMonth && d.getDate() === day;
    });
  };

  const selectedEvents = getEventsForDay(selectedDate);

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentYear(currentYear - 1);
      setCurrentMonth(11);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
    setSelectedDate(1);
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentYear(currentYear + 1);
      setCurrentMonth(0);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
    setSelectedDate(1);
  };

  const calendarDays: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) {
    calendarDays.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    calendarDays.push(d);
  }

  return (
    <Screen safeAreaEdges={['left', 'right']} backgroundColor="#F0F0F3">
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.headerTitle}>日历视图</Text>
      </View>

      {/* Calendar */}
      <View style={styles.calendarContainer}>
        <View style={styles.monthNav}>
          <TouchableOpacity onPress={prevMonth} style={styles.navBtn}>
            <FontAwesome6 name="chevron-left" size={16} color="#6C63FF" />
          </TouchableOpacity>
          <Text style={styles.monthText}>
            {currentYear}年 {MONTHS[currentMonth]}
          </Text>
          <TouchableOpacity onPress={nextMonth} style={styles.navBtn}>
            <FontAwesome6 name="chevron-right" size={16} color="#6C63FF" />
          </TouchableOpacity>
        </View>

        <View style={styles.weekdayRow}>
          {WEEKDAYS.map(day => (
            <Text key={day} style={styles.weekdayText}>{day}</Text>
          ))}
        </View>

        <View style={styles.daysGrid}>
          {calendarDays.map((day, idx) => {
            if (day === null) {
              return <View key={`empty-${idx}`} style={styles.dayCell} />;
            }
            const dayEvents = getEventsForDay(day);
            const hasEvents = dayEvents.length > 0;
            const isToday = isCurrentMonth && day === today.getDate();
            const isSelected = day === selectedDate;

            return (
              <TouchableOpacity
                key={day}
                style={[
                  styles.dayCell,
                  isSelected && styles.dayCellSelected,
                  isToday && styles.dayCellToday,
                ]}
                onPress={() => setSelectedDate(day)}
              >
                <Text
                  style={[
                    styles.dayText,
                    isSelected && styles.dayTextSelected,
                    isToday && !isSelected && styles.dayTextToday,
                  ]}
                >
                  {day}
                </Text>
                {hasEvents && (
                  <View style={styles.dotRow}>
                    {dayEvents.slice(0, 3).map((e, i) => {
                      const catInfo = CATEGORY_MAP[e.category] || CATEGORY_MAP.work;
                      return (
                        <View
                          key={i}
                          style={[styles.dot, { backgroundColor: catInfo.color }]}
                        />
                      );
                    })}
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Events for selected day */}
      <View style={styles.eventsSection}>
        <Text style={styles.sectionTitle}>
          {currentMonth + 1}月{selectedDate}日 的事件
        </Text>
        {selectedEvents.length === 0 ? (
          <View style={styles.emptyDay}>
            <FontAwesome6 name="calendar-xmark" size={32} color="#B2BEC3" />
            <Text style={styles.emptyDayText}>当天没有事件</Text>
          </View>
        ) : (
          selectedEvents.map(event => {
            const catInfo = CATEGORY_MAP[event.category] || CATEGORY_MAP.work;
            const priInfo = PRIORITY_MAP[event.priority] || PRIORITY_MAP.medium;
            return (
              <TouchableOpacity
                key={event.id}
                style={styles.eventCard}
                onPress={() => router.push('/detail', { eventId: event.id })}
                activeOpacity={0.7}
              >
                <View style={[styles.eventDot, { backgroundColor: catInfo.color }]} />
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      styles.eventTitle,
                      event.is_completed && styles.eventTitleDone,
                    ]}
                    numberOfLines={1}
                  >
                    {event.title}
                  </Text>
                  <View style={styles.eventMeta}>
                    <View style={[styles.miniTag, { backgroundColor: `${priInfo.color}15` }]}>
                      <Text style={[styles.miniTagText, { color: priInfo.color }]}>
                        {priInfo.label}
                      </Text>
                    </View>
                    {event.person ? (
                      <Text style={styles.eventPerson}>
                        <FontAwesome6 name="user" size={9} color="#636E72" /> {event.person}
                      </Text>
                    ) : null}
                    {event.remind_time && (
                      <Text style={styles.eventTime}>
                        {new Date(event.remind_time).getHours().toString().padStart(2, '0')}:
                        {new Date(event.remind_time).getMinutes().toString().padStart(2, '0')}
                      </Text>
                    )}
                  </View>
                </View>
                {event.is_completed && (
                  <FontAwesome6 name="circle-check" size={20} color="#00B894" />
                )}
              </TouchableOpacity>
            );
          })
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#2D3436',
  },
  calendarContainer: {
    backgroundColor: '#F0F0F3',
    marginHorizontal: 16,
    borderRadius: 20,
    padding: 16,
    shadowColor: '#D1D9E6',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 4,
  },
  monthNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(108,99,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2D3436',
  },
  weekdayRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  weekdayText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: '#B2BEC3',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  dayCellSelected: {
    backgroundColor: '#6C63FF',
  },
  dayCellToday: {
    borderWidth: 1.5,
    borderColor: '#6C63FF',
  },
  dayText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2D3436',
  },
  dayTextSelected: {
    color: '#FFFFFF',
  },
  dayTextToday: {
    color: '#6C63FF',
  },
  dotRow: {
    flexDirection: 'row',
    gap: 2,
    position: 'absolute',
    bottom: 2,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  eventsSection: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 100,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2D3436',
    marginBottom: 12,
  },
  emptyDay: {
    alignItems: 'center',
    paddingTop: 40,
  },
  emptyDayText: {
    fontSize: 14,
    color: '#B2BEC3',
    marginTop: 12,
  },
  eventCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F0F3',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#D1D9E6',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 3,
  },
  eventDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 12,
  },
  eventTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2D3436',
  },
  eventTitleDone: {
    textDecorationLine: 'line-through',
    color: '#B2BEC3',
  },
  eventMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  miniTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  miniTagText: {
    fontSize: 10,
    fontWeight: '700',
  },
  eventPerson: {
    fontSize: 11,
    color: '#636E72',
  },
  eventTime: {
    fontSize: 11,
    color: '#636E72',
    fontWeight: '600',
  },
});

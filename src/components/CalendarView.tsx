'use client';

import { useState } from 'react';
import {
  Box,
  Grid,
  Text,
  VStack,
  HStack,
  Button,
  useColorModeValue,
} from '@chakra-ui/react';
import { ChevronLeftIcon, ChevronRightIcon } from '@chakra-ui/icons';
import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  format,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  isToday,
  startOfWeek,
  endOfWeek,
  eachWeekOfInterval,
} from 'date-fns';
import useStore from '@/store/useStore';

export function CalendarView() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const { assignments, classes, filterOptions } = useStore();

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);

  const weeks = eachWeekOfInterval(
    { start: calendarStart, end: calendarEnd },
    { weekStartsOn: 0 }
  );

  const filteredAssignments = assignments.filter((assignment) => {
    if (!filterOptions.showCompleted && assignment.completed) return false;
    if (filterOptions.selectedSemester && assignment.semester !== filterOptions.selectedSemester) return false;
    if (filterOptions.selectedClasses.length > 0 && !filterOptions.selectedClasses.includes(assignment.classId)) return false;
    if (filterOptions.selectedTypes.length > 0 && !filterOptions.selectedTypes.includes(assignment.type.id)) return false;
    return true;
  });

  const getAssignmentsForDay = (date: Date) => {
    return filteredAssignments.filter((assignment) =>
      isSameDay(new Date(assignment.dueDate), date)
    );
  };

  const dayBg = useColorModeValue('white', 'gray.700');
  const todayBg = useColorModeValue('blue.50', 'blue.900');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const textColor = useColorModeValue('gray.600', 'gray.400');
  const weekdayColor = useColorModeValue('gray.500', 'gray.400');

  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <VStack spacing={4} align="stretch">
      <HStack justify="space-between" align="center">
        <Text fontSize="xl" fontWeight="bold">
          {format(currentDate, 'MMMM yyyy')}
        </Text>
        <HStack>
          <Button
            size="sm"
            onClick={() => setCurrentDate(subMonths(currentDate, 1))}
            leftIcon={<ChevronLeftIcon />}
          >
            Previous
          </Button>
          <Button
            size="sm"
            onClick={() => setCurrentDate(new Date())}
          >
            Today
          </Button>
          <Button
            size="sm"
            onClick={() => setCurrentDate(addMonths(currentDate, 1))}
            rightIcon={<ChevronRightIcon />}
          >
            Next
          </Button>
        </HStack>
      </HStack>

      <Grid templateColumns="repeat(7, 1fr)" gap={2}>
        {weekdays.map((day) => (
          <Box key={day} textAlign="center" color={weekdayColor} fontWeight="medium" py={2}>
            {day}
          </Box>
        ))}

        {weeks.map((week) => {
          const days = eachDayOfInterval({
            start: week,
            end: endOfWeek(week),
          });

          return days.map((day) => {
            const dayAssignments = getAssignmentsForDay(day);
            const isCurrentMonth = isSameMonth(day, currentDate);

            return (
              <Box
                key={day.toString()}
                bg={isToday(day) ? todayBg : dayBg}
                p={2}
                borderWidth="1px"
                borderColor={borderColor}
                borderRadius="md"
                opacity={isCurrentMonth ? 1 : 0.5}
                minH="100px"
                _hover={{ shadow: 'md' }}
              >
                <Text
                  fontWeight={isToday(day) ? 'bold' : 'normal'}
                  color={textColor}
                >
                  {format(day, 'd')}
                </Text>
                <VStack align="stretch" spacing={1} mt={2}>
                  {dayAssignments.map((assignment) => {
                    const classColor = classes.find(
                      (c) => c.id === assignment.classId
                    )?.color || 'gray.500';

                    return (
                      <Box
                        key={assignment.id}
                        p={1}
                        bg={useColorModeValue(
                          `${classColor}.500`,
                          `${classColor}.600`
                        )}
                        color="white"
                        borderRadius="sm"
                        fontSize="xs"
                        textDecoration={assignment.completed ? 'line-through' : 'none'}
                        cursor="pointer"
                        _hover={{ filter: 'brightness(1.1)' }}
                        title={`${assignment.title} - ${assignment.type.name}`}
                      >
                        {assignment.title}
                      </Box>
                    );
                  })}
                </VStack>
              </Box>
            );
          });
        })}
      </Grid>
    </VStack>
  );
}

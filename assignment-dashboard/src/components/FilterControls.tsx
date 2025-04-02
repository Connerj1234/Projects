'use client';

import {
  Box,
  Button,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Text,
  HStack,
  Checkbox,
  useColorModeValue,
  VStack,
  Grid,
  GridItem,
  Divider,
  Flex,
  Select,
} from '@chakra-ui/react';
import { BsFilter } from 'react-icons/bs';
import useStore from '@/store/useStore';
import { useState } from 'react';

export function FilterControls() {
  const {
    filterOptions,
    setFilterOptions,
    classes,
    assignmentTypes,
  } = useStore();

  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'whiteAlpha.300');
  const textColor = useColorModeValue('gray.800', 'whiteAlpha.900');
  const buttonHoverBg = useColorModeValue('gray.100', 'whiteAlpha.300');
  const mutedTextColor = useColorModeValue('gray.600', 'whiteAlpha.700');

  const [timeFrame, setTimeFrame] = useState('semester'); // Default to semester

  // Get classes for selected semester
  const semesterClasses = classes.filter(c => c.semesterId === filterOptions.selectedSemester);

  const hasActiveFilters = filterOptions.selectedClasses.length > 0 || filterOptions.selectedTypes.length > 0;

  const handleClassToggle = (classId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const newSelectedClasses = filterOptions.selectedClasses.includes(classId)
      ? filterOptions.selectedClasses.filter(id => id !== classId)
      : [...filterOptions.selectedClasses, classId];
    setFilterOptions({ ...filterOptions, selectedClasses: newSelectedClasses });
  };

  const handleTypeToggle = (typeId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const newSelectedTypes = filterOptions.selectedTypes.includes(typeId)
      ? filterOptions.selectedTypes.filter(id => id !== typeId)
      : [...filterOptions.selectedTypes, typeId];
    setFilterOptions({ ...filterOptions, selectedTypes: newSelectedTypes });
  };

  const handleSelectAllClasses = () => {
    const allClassIds = classes.map(c => c.id);
    const newSelectedClasses = filterOptions.selectedClasses.length === allClassIds.length ? [] : allClassIds;
    setFilterOptions({ ...filterOptions, selectedClasses: newSelectedClasses });
  };

  const handleSelectAllTypes = () => {
    const allTypeIds = assignmentTypes.map(t => t.id);
    const newSelectedTypes = filterOptions.selectedTypes.length === allTypeIds.length ? [] : allTypeIds;
    setFilterOptions({ ...filterOptions, selectedTypes: newSelectedTypes });
  };

  return (
    <Box>
      <Menu closeOnSelect={false}>
        <MenuButton
          as={Button}
          leftIcon={<BsFilter />}
          size="sm"
          variant="ghost"
          color={hasActiveFilters ? "blue.500" : textColor}
          _hover={{ bg: buttonHoverBg }}
        >
          Filters
        </MenuButton>
        <MenuList bg={bgColor} borderColor={borderColor} p={4} minW="500px">
          {/* Time Frame Filter */}
          <Flex direction="column" mb={4}>
            <Text fontWeight="medium" mb={2}>Time Frame</Text>
            <Select value={timeFrame} onChange={(e) => setTimeFrame(e.target.value)} mb={4}>
              <option value="semester">Current Semester</option>
              <option value="week">This Week</option>
              <option value="day">Today</option>
            </Select>
          </Flex>

          <Grid templateColumns="1fr 2px 1fr" gap={4}>
            {/* Classes Section */}
            <GridItem>
              <Text color={textColor} fontSize="sm" fontWeight="medium" mb={3}>Classes</Text>
              {semesterClasses.length === 0 ? (
                <Text color={mutedTextColor} fontSize="sm" fontStyle="italic">No classes available</Text>
              ) : (
                <VStack align="stretch" spacing={2}>
                  <Box
                    px={3}
                    py={2}
                    _hover={{ bg: buttonHoverBg }}
                    cursor="pointer"
                    role="button"
                    onClick={handleSelectAllClasses}
                  >
                    <Checkbox
                      isChecked={filterOptions.selectedClasses.length === semesterClasses.length}
                      isIndeterminate={filterOptions.selectedClasses.length > 0 && filterOptions.selectedClasses.length < semesterClasses.length}
                      onChange={(e) => handleSelectAllClasses()}
                    >
                      Select All Classes
                    </Checkbox>
                  </Box>
                  {semesterClasses.map((c) => (
                    <Box
                      key={c.id}
                      px={3}
                      py={2}
                      _hover={{ bg: buttonHoverBg }}
                      cursor="pointer"
                      role="button"
                      onClick={(e) => handleClassToggle(c.id, e)}
                    >
                      <Checkbox
                        isChecked={filterOptions.selectedClasses.includes(c.id)}
                        onChange={(e) => handleClassToggle(c.id)}
                      >
                        <HStack spacing={2}>
                          <Box w="3" h="3" borderRadius="full" bg={c.color} />
                          <Text>{c.name}</Text>
                        </HStack>
                      </Checkbox>
                    </Box>
                  ))}
                </VStack>
              )}
            </GridItem>

            {/* Divider */}
            <GridItem>
              <Divider orientation="vertical" borderColor={borderColor} />
            </GridItem>

            {/* Types Section */}
            <GridItem>
              <Text color={textColor} fontSize="sm" fontWeight="medium" mb={3}>Assignment Types</Text>
              {assignmentTypes.length === 0 ? (
                <Text color={mutedTextColor} fontSize="sm" fontStyle="italic">No types available</Text>
              ) : (
                <VStack align="stretch" spacing={2}>
                  <Box
                    px={3}
                    py={2}
                    _hover={{ bg: buttonHoverBg }}
                    cursor="pointer"
                    role="button"
                    onClick={handleSelectAllTypes}
                  >
                    <Checkbox
                      isChecked={filterOptions.selectedTypes.length === assignmentTypes.length}
                      isIndeterminate={filterOptions.selectedTypes.length > 0 && filterOptions.selectedTypes.length < assignmentTypes.length}
                      onChange={(e) => handleSelectAllTypes()}
                    >
                      Select All Types
                    </Checkbox>
                  </Box>
                  {assignmentTypes.map((type) => (
                    <Box
                      key={type.id}
                      px={3}
                      py={2}
                      _hover={{ bg: buttonHoverBg }}
                      cursor="pointer"
                      role="button"
                      onClick={(e) => handleTypeToggle(type.id, e)}
                    >
                      <Checkbox
                        isChecked={filterOptions.selectedTypes.includes(type.id)}
                        onChange={(e) => handleTypeToggle(type.id)}
                      >
                        <HStack spacing={2}>
                          <Box w="3" h="3" borderRadius="full" bg={type.color} />
                          <Text>{type.name}</Text>
                        </HStack>
                      </Checkbox>
                    </Box>
                  ))}
                </VStack>
              )}
            </GridItem>
          </Grid>
        </MenuList>
      </Menu>
    </Box>
  );
}

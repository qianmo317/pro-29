import { CircularProgress, CircularProgressLabel, HStack, Box, Text } from '@chakra-ui/react'
import { getSLARemaining, getSLAColor } from '@/utils/slaUtils'

const pulseKeyframes = 'pulse_sla'
const pulseStyle = `@keyframes ${pulseKeyframes} {
  0% { opacity: 1; }
  50% { opacity: 0.4; }
  100% { opacity: 1; }
}`

interface SLAIndicatorProps {
  slaDeadline: string
  size?: 'sm' | 'md'
}

export default function SLAIndicator({ slaDeadline, size = 'md' }: SLAIndicatorProps) {
  const remaining = getSLARemaining(slaDeadline)
  const color = getSLAColor(remaining)

  return (
    <>
      <style>{pulseStyle}</style>
      {size === 'sm' ? (
        <HStack spacing={1.5}>
          <Box
            w="8px"
            h="8px"
            borderRadius="50%"
            bg={color}
            flexShrink={0}
            animation={remaining.isOverdue ? `${pulseKeyframes} 1.5s ease-in-out infinite` : undefined}
          />
          {remaining.isOverdue ? (
            <Text fontSize="xs" fontWeight="600" color={color} animation={`${pulseKeyframes} 1.5s ease-in-out infinite`}>
              已超时
            </Text>
          ) : (
            <Text fontSize="xs" fontWeight="500" color={color}>
              {remaining.hours}小时{remaining.minutes}分钟
            </Text>
          )}
        </HStack>
      ) : (
        <HStack spacing={3}>
          <CircularProgress
            value={remaining.isOverdue ? 100 : remaining.percentage}
            size="64px"
            thickness="10px"
            color={color}
            trackColor="#EDF2F7"
            capIsRound
          >
            <CircularProgressLabel>
              {remaining.isOverdue ? (
                <Text
                  fontSize="xs"
                  fontWeight="700"
                  color={color}
                  animation={`${pulseKeyframes} 1.5s ease-in-out infinite`}
                >
                  已超时
                </Text>
              ) : (
                <Text fontSize="xs" fontWeight="600" color={color}>
                  {remaining.hours}:{String(remaining.minutes).padStart(2, '0')}
                </Text>
              )}
            </CircularProgressLabel>
          </CircularProgress>
          <Box>
            {remaining.isOverdue ? (
              <Text fontSize="sm" fontWeight="600" color={color}>
                已超时
              </Text>
            ) : (
              <Text fontSize="sm" fontWeight="500" color="#2D3748">
                剩余 {remaining.hours}小时{remaining.minutes}分钟
              </Text>
            )}
            <Text fontSize="xs" color="#A0AEC0">
              SLA 响应时效
            </Text>
          </Box>
        </HStack>
      )}
    </>
  )
}

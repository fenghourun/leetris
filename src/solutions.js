export const SOLUTIONS = {
  'two-sum': `seen = {}
for i, value in enumerate(nums):
    need = target - value
    if need in seen:
        return [seen[need], i]
    seen[value] = i
return []`,
  'first-unique': `counts = {}
for char in text:
    counts[char] = counts.get(char, 0) + 1
for i, char in enumerate(text):
    if counts[char] == 1:
        return i
return -1`,
  'valid-palindrome': `left, right = 0, len(text) - 1
while left < right:
    while left < right and not text[left].isalnum():
        left += 1
    while left < right and not text[right].isalnum():
        right -= 1
    if text[left].lower() != text[right].lower():
        return False
    left += 1
    right -= 1
return True`,
  'sorted-pair': `left, right = 0, len(nums) - 1
while left < right:
    total = nums[left] + nums[right]
    if total == target:
        return [left, right]
    if total < target:
        left += 1
    else:
        right -= 1
return []`,
  'sorted-squares': `result = [0] * len(nums)
left, right = 0, len(nums) - 1
for write in range(len(nums) - 1, -1, -1):
    if abs(nums[left]) > abs(nums[right]):
        result[write] = nums[left] ** 2
        left += 1
    else:
        result[write] = nums[right] ** 2
        right -= 1
return result`,
  'max-water': `left, right = 0, len(heights) - 1
best = 0
while left < right:
    best = max(best, (right - left) * min(heights[left], heights[right]))
    if heights[left] < heights[right]:
        left += 1
    else:
        right -= 1
return best`,
  'valid-brackets': `pairs = {')': '(', ']': '[', '}': '{'}
stack = []
for char in text:
    if char not in pairs:
        stack.append(char)
    elif not stack or stack.pop() != pairs[char]:
        return False
return not stack`,
  'adjacent-dupes': `stack = []
for char in text:
    if stack and stack[-1] == char:
        stack.pop()
    else:
        stack.append(char)
return ''.join(stack)`,
  'daily-warmer': `answer = [0] * len(temps)
stack = []
for i, temp in enumerate(temps):
    while stack and temps[stack[-1]] < temp:
        previous = stack.pop()
        answer[previous] = i - previous
    stack.append(i)
return answer`,
  'binary-search': `left, right = 0, len(nums) - 1
while left <= right:
    middle = (left + right) // 2
    if nums[middle] == target:
        return middle
    if nums[middle] < target:
        left = middle + 1
    else:
        right = middle - 1
return -1`,
  'lower-bound': `left, right = 0, len(nums)
while left < right:
    middle = (left + right) // 2
    if nums[middle] < target:
        left = middle + 1
    else:
        right = middle
return left`,
  'window-sum': `window = sum(nums[:k])
best = window
for right in range(k, len(nums)):
    window += nums[right] - nums[right - k]
    best = max(best, window)
return best`,
  'longest-unique': `left = 0
last_seen = {}
best = 0
for right, char in enumerate(text):
    if char in last_seen and last_seen[char] >= left:
        left = last_seen[char] + 1
    last_seen[char] = right
    best = max(best, right - left + 1)
return best`,
  'prefix-range': `prefix = [0]
for value in nums:
    prefix.append(prefix[-1] + value)
return [prefix[right + 1] - prefix[left] for left, right in queries]`,
  'climb-stairs': `previous, current = 0, 1
for _ in range(n):
    previous, current = current, previous + current
return current`,
  'house-robber': `two_back = one_back = 0
for value in nums:
    two_back, one_back = one_back, max(one_back, two_back + value)
return one_back`,
  'coin-change': `best = [amount + 1] * (amount + 1)
best[0] = 0
for total in range(1, amount + 1):
    for coin in coins:
        if coin <= total:
            best[total] = min(best[total], best[total - coin] + 1)
return best[amount] if best[amount] <= amount else -1`,
  'word-break': `words = set(words)
possible = [False] * (len(text) + 1)
possible[0] = True
for end in range(1, len(text) + 1):
    possible[end] = any(possible[start] and text[start:end] in words for start in range(end))
return possible[-1]`,
  'islands': `if not grid:
    return 0
count = 0
for row in range(len(grid)):
    for col in range(len(grid[0])):
        if grid[row][col] != 1:
            continue
        count += 1
        stack = [(row, col)]
        grid[row][col] = 0
        while stack:
            r, c = stack.pop()
            for dr, dc in ((1,0),(-1,0),(0,1),(0,-1)):
                nr, nc = r + dr, c + dc
                if 0 <= nr < len(grid) and 0 <= nc < len(grid[0]) and grid[nr][nc] == 1:
                    grid[nr][nc] = 0
                    stack.append((nr, nc))
return count`,
  'components': `graph = [[] for _ in range(n)]
for a, b in edges:
    graph[a].append(b)
    graph[b].append(a)
seen = set()
count = 0
for start in range(n):
    if start in seen:
        continue
    count += 1
    stack = [start]
    seen.add(start)
    while stack:
        node = stack.pop()
        for neighbor in graph[node]:
            if neighbor not in seen:
                seen.add(neighbor)
                stack.append(neighbor)
return count`,
  'shortest-grid': `from collections import deque
if not grid or grid[0][0] or grid[-1][-1]:
    return -1
queue = deque([(0, 0, 0)])
seen = {(0, 0)}
while queue:
    row, col, distance = queue.popleft()
    if (row, col) == (len(grid) - 1, len(grid[0]) - 1):
        return distance
    for dr, dc in ((1,0),(-1,0),(0,1),(0,-1)):
        nr, nc = row + dr, col + dc
        if 0 <= nr < len(grid) and 0 <= nc < len(grid[0]) and not grid[nr][nc] and (nr, nc) not in seen:
            seen.add((nr, nc))
            queue.append((nr, nc, distance + 1))
return -1`,
  'merge-intervals': `if not ranges:
    return []
ranges.sort()
merged = [ranges[0][:]]
for start, end in ranges[1:]:
    if start <= merged[-1][1]:
        merged[-1][1] = max(merged[-1][1], end)
    else:
        merged.append([start, end])
return merged`,
  'meeting-rooms': `meetings.sort()
return all(meetings[i][0] >= meetings[i - 1][1] for i in range(1, len(meetings)))`,
  'jump-game': `farthest = 0
for index, jump in enumerate(nums):
    if index > farthest:
        return False
    farthest = max(farthest, index + jump)
return True`,
  'kth-largest': `import heapq
heap = []
for value in nums:
    heapq.heappush(heap, value)
    if len(heap) > k:
        heapq.heappop(heap)
return heap[0]`,
  'top-k-frequent': `import heapq
counts = {}
for value in nums:
    counts[value] = counts.get(value, 0) + 1
return heapq.nsmallest(k, counts, key=lambda value: (-counts[value], value))`,
  'subsets': `result = []
path = []
def search(index):
    if index == len(nums):
        result.append(path[:])
        return
    path.append(nums[index])
    search(index + 1)
    path.pop()
    search(index + 1)
search(0)
return result`,
  'permutations': `result = []
def search(path, remaining):
    if not remaining:
        result.append(path)
        return
    for i, value in enumerate(remaining):
        search(path + [value], remaining[:i] + remaining[i + 1:])
search([], nums)
return result`,
  'tree-depth': `if not tree:
    return 0
return 1 + max(solve(tree[1]), solve(tree[2]))`,
  'tree-preorder': `if not tree:
    return []
return [tree[0]] + solve(tree[1]) + solve(tree[2])`,
  'valid-bst': `def valid(node, low, high):
    if not node:
        return True
    value, left, right = node
    return low < value < high and valid(left, low, value) and valid(right, value, high)
return valid(tree, float('-inf'), float('inf'))`,
  'ransom-note': `counts = {}
for char in letters:
    counts[char] = counts.get(char, 0) + 1
for char in message:
    if counts.get(char, 0) == 0:
        return False
    counts[char] -= 1
return True`,
  'longest-consecutive': `values = set(nums)
best = 0
for value in values:
    if value - 1 not in values:
        end = value
        while end in values:
            end += 1
        best = max(best, end - value)
return best`,
  'move-zeroes': `result = [value for value in nums if value != 0]
return result + [0] * (len(nums) - len(result))`,
  'three-sum': `nums.sort()
result = []
for i in range(len(nums) - 2):
    if i and nums[i] == nums[i - 1]:
        continue
    left, right = i + 1, len(nums) - 1
    while left < right:
        total = nums[i] + nums[left] + nums[right]
        if total < 0:
            left += 1
        elif total > 0:
            right -= 1
        else:
            result.append([nums[i], nums[left], nums[right]])
            left += 1
            right -= 1
            while left < right and nums[left] == nums[left - 1]:
                left += 1
return result`,
  'backspace-text': `def build(value):
    stack = []
    for char in value:
        if char == '#':
            if stack:
                stack.pop()
        else:
            stack.append(char)
    return stack
return build(a) == build(b)`,
  'rpn': `stack = []
for token in tokens:
    if token not in '+-*/':
        stack.append(int(token))
        continue
    right, left = stack.pop(), stack.pop()
    if token == '+': stack.append(left + right)
    elif token == '-': stack.append(left - right)
    elif token == '*': stack.append(left * right)
    else: stack.append(int(left / right))
return stack[-1]`,
  'next-greater': `answer = [-1] * len(nums)
stack = []
for i, value in enumerate(nums):
    while stack and nums[stack[-1]] < value:
        answer[stack.pop()] = value
    stack.append(i)
return answer`,
  'integer-sqrt': `left, right = 0, n
answer = 0
while left <= right:
    middle = (left + right) // 2
    if middle * middle <= n:
        answer = middle
        left = middle + 1
    else:
        right = middle - 1
return answer`,
  'rotated-search': `left, right = 0, len(nums) - 1
while left <= right:
    middle = (left + right) // 2
    if nums[middle] == target:
        return middle
    if nums[left] <= nums[middle]:
        if nums[left] <= target < nums[middle]: right = middle - 1
        else: left = middle + 1
    else:
        if nums[middle] < target <= nums[right]: left = middle + 1
        else: right = middle - 1
return -1`,
  'target-range': `def bound(find_right):
    left, right = 0, len(nums)
    while left < right:
        middle = (left + right) // 2
        if nums[middle] < target or (find_right and nums[middle] == target): left = middle + 1
        else: right = middle
    return left
left, right = bound(False), bound(True) - 1
return [left, right] if left <= right and left < len(nums) and nums[left] == target else [-1, -1]`,
  'max-average': `window = sum(nums[:k])
best = window
for right in range(k, len(nums)):
    window += nums[right] - nums[right - k]
    best = max(best, window)
return best / k`,
  'min-window-length': `left = total = 0
best = len(nums) + 1
for right, value in enumerate(nums):
    total += value
    while total >= target:
        best = min(best, right - left + 1)
        total -= nums[left]
        left += 1
return 0 if best > len(nums) else best`,
  'pivot-index': `total = sum(nums)
left = 0
for i, value in enumerate(nums):
    if left == total - left - value:
        return i
    left += value
return -1`,
  'subarray-sum': `counts = {0: 1}
prefix = answer = 0
for value in nums:
    prefix += value
    answer += counts.get(prefix - k, 0)
    counts[prefix] = counts.get(prefix, 0) + 1
return answer`,
  'max-subarray': `current = best = nums[0]
for value in nums[1:]:
    current = max(value, current + value)
    best = max(best, current)
return best`,
  'lis': `if not nums:
    return 0
best = [1] * len(nums)
for i in range(len(nums)):
    for j in range(i):
        if nums[j] < nums[i]:
            best[i] = max(best[i], best[j] + 1)
return max(best)`,
  'flood-fill': `old = image[row][col]
if old == color:
    return image
stack = [(row, col)]
image[row][col] = color
while stack:
    r, c = stack.pop()
    for dr, dc in ((1,0),(-1,0),(0,1),(0,-1)):
        nr, nc = r + dr, c + dc
        if 0 <= nr < len(image) and 0 <= nc < len(image[0]) and image[nr][nc] == old:
            image[nr][nc] = color
            stack.append((nr, nc))
return image`,
  'course-order': `from collections import deque
graph = [[] for _ in range(n)]
indegree = [0] * n
for course, prerequisite in prereqs:
    graph[prerequisite].append(course)
    indegree[course] += 1
queue = deque(i for i in range(n) if indegree[i] == 0)
finished = 0
while queue:
    node = queue.popleft()
    finished += 1
    for neighbor in graph[node]:
        indegree[neighbor] -= 1
        if indegree[neighbor] == 0:
            queue.append(neighbor)
return finished == n`,
  'insert-interval': `result = []
i = 0
while i < len(ranges) and ranges[i][1] < new[0]:
    result.append(ranges[i])
    i += 1
while i < len(ranges) and ranges[i][0] <= new[1]:
    new = [min(new[0], ranges[i][0]), max(new[1], ranges[i][1])]
    i += 1
return result + [new] + ranges[i:]`,
  'last-stone': `import heapq
heap = [-value for value in stones]
heapq.heapify(heap)
while len(heap) > 1:
    first = -heapq.heappop(heap)
    second = -heapq.heappop(heap)
    if first != second:
        heapq.heappush(heap, -(first - second))
return -heap[0] if heap else 0`,
  'combinations': `result = []
def search(start, path):
    if len(path) == k:
        result.append(path[:])
        return
    for value in range(start, n + 1):
        path.append(value)
        search(value + 1, path)
        path.pop()
search(1, [])
return result`,
  'invert-tree': `if not tree:
    return None
return [tree[0], solve(tree[2]), solve(tree[1])]`,
  'tree-levels': `from collections import deque
if not tree:
    return []
queue = deque([tree])
levels = []
while queue:
    level = []
    for _ in range(len(queue)):
        node = queue.popleft()
        level.append(node[0])
        if node[1]: queue.append(node[1])
        if node[2]: queue.append(node[2])
    levels.append(level)
return levels`,
};

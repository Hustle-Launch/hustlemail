#!/bin/bash
# Fix all phosphor-icons imports in the codebase
# Phosphor uses different naming from lucide-react

cd ~/Projects/hustle/mail/apps/web

# Icon name mappings (lucide → phosphor)
# These icons don't exist in phosphor, replacing with closest alternatives

# Common icon replacements
find . -name "*.tsx" -exec sed -i '' \
  -e 's/\bGithub\b/GithubLogo/g' \
  -e 's/\bTwitter\b/XLogo/g' \
  -e 's/\bZap\b/Lightning/g' \
  -e 's/\bBot\b/Robot/g' \
  -e 's/\bDollarSign\b/CurrencyDollar/g' \
  -e 's/\bSparkles\b/Sparkle/g' \
  -e 's/\bBuilding2\b/Buildings/g' \
  -e 's/\bRocket\b/RocketLaunch/g' \
  -e 's/\bCode2\b/Code/g' \
  -e 's/\bStar\b/Star/g' \
  -e 's/\bArchive\b/Archive/g' \
  -e 's/\bTrash\b/Trash/g' \
  -e 's/\bTag\b/Tag/g' \
  -e 's/\bSettings\b/Gear/g' \
  -e 's/\bPenSquare\b/PencilSimple/g' \
  -e 's/\bMagnifyingGlass\b/MagnifyingGlass/g' \
  -e 's/\bLogOut\b/SignOut/g' \
  -e 's/\bChevronDown\b/CaretDown/g' \
  -e 's/\bChevronUp\b/CaretUp/g' \
  -e 's/\bChevronLeft\b/CaretLeft/g' \
  -e 's/\bChevronRight\b/CaretRight/g' \
  -e 's/\bUser\b/User/g' \
  -e 's/\bBarChart3\b/ChartBar/g' \
  -e 's/\bTrendingUp\b/TrendUp/g' \
  -e 's/\bTrendingDown\b/TrendDown/g' \
  -e 's/\bRefreshCw\b/ArrowClockwise/g' \
  -e 's/\bSend\b/PaperPlaneTilt/g' \
  -e 's/\bPaperclip\b/Paperclip/g' \
  -e 's/\bBold\b/TextBolder/g' \
  -e 's/\bItalic\b/TextItalic/g' \
  -e 's/\bList\b/List/g' \
  -e 's/\bListOrdered\b/ListNumbers/g' \
  -e 's/\bReply\b/ArrowBendUpLeft/g' \
  -e 's/\bReplyAll\b/ArrowBendDoubleUpLeft/g' \
  -e 's/\bForward\b/ArrowBendUpRight/g' \
  -e 's/\bMoreVertical\b/DotsThreeVertical/g' \
  -e 's/\bMoreHorizontal\b/DotsThree/g' \
  -e 's/\bFile\b/File/g' \
  -e 's/\bFileText\b/FileText/g' \
  -e 's/\bImage\b/Image/g' \
  -e 's/\bDownload\b/DownloadSimple/g' \
  -e 's/\bX\b/X/g' \
  -e 's/\bLink\b/Link/g' \
  -e 's/\bPlus\b/Plus/g' \
  -e 's/\bMinus\b/Minus/g' \
  -e 's/\bAlertTriangle\b/Warning/g' \
  -e 's/\bAlertCircle\b/WarningCircle/g' \
  -e 's/\bInfo\b/Info/g' \
  -e 's/\bGlobe\b/Globe/g' \
  -e 's/\bLock\b/Lock/g' \
  -e 's/\bUnlock\b/LockOpen/g' \
  -e 's/\bEye\b/Eye/g' \
  -e 's/\bEyeOff\b/EyeSlash/g' \
  -e 's/\bCopy\b/Copy/g' \
  -e 's/\bClipboard\b/Clipboard/g' \
  -e 's/\bCalendar\b/Calendar/g' \
  -e 's/\bClock\b/Clock/g' \
  -e 's/\bSearch\b/MagnifyingGlass/g' \
  -e 's/\bFilter\b/Funnel/g' \
  -e 's/\bMenu\b/List/g' \
  -e 's/\bHome\b/House/g' \
  -e 's/\bMail\b/Envelope/g' \
  {} \;

echo "Done fixing phosphor icon imports"

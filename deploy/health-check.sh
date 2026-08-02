#!/usr/bin/env bash
# فحص صحة تلقائي لخدمة التطبيق على المنفذ 3000
# الاستخدام: bash deploy/health-check.sh  (يُشغَّل عبر cron كل دقيقة)

set -u

URL="${HEALTH_URL:-http://127.0.0.1:3000/api/public/health}"
PM2_APP="${PM2_APP:-lamsa}"
STATE_FILE="${STATE_FILE:-/tmp/lamsa-health.state}"
LOG_FILE="${LOG_FILE:-/var/log/lamsa-health.log}"
MAX_FAILS="${MAX_FAILS:-2}"          # عدد الإخفاقات المتتالية قبل التنبيه
AUTO_RESTART="${AUTO_RESTART:-1}"    # 1 = إعادة تشغيل تلقائية عبر pm2

# التنبيه: اضبط أيًا من هذه المتغيرات في البيئة
TELEGRAM_BOT_TOKEN="${TELEGRAM_BOT_TOKEN:-}"
TELEGRAM_CHAT_ID="${TELEGRAM_CHAT_ID:-}"
ALERT_WEBHOOK="${ALERT_WEBHOOK:-}"   # Slack/Discord/أي webhook يقبل {"text": "..."}
ALERT_EMAIL="${ALERT_EMAIL:-}"       # يحتاج الأمر mail

log() { echo "$(date -Is) $*" >> "$LOG_FILE" 2>/dev/null || true; }

notify() {
  local msg="$1"
  log "ALERT: $msg"
  if [ -n "$TELEGRAM_BOT_TOKEN" ] && [ -n "$TELEGRAM_CHAT_ID" ]; then
    curl -s -m 10 -X POST \
      "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
      -d "chat_id=${TELEGRAM_CHAT_ID}" --data-urlencode "text=${msg}" > /dev/null
  fi
  if [ -n "$ALERT_WEBHOOK" ]; then
    curl -s -m 10 -X POST -H 'Content-Type: application/json' \
      -d "{\"text\":\"${msg//\"/\\\"}\",\"content\":\"${msg//\"/\\\"}\"}" \
      "$ALERT_WEBHOOK" > /dev/null
  fi
  if [ -n "$ALERT_EMAIL" ] && command -v mail > /dev/null 2>&1; then
    echo "$msg" | mail -s "Lamsa health alert" "$ALERT_EMAIL"
  fi
}

fails=0
[ -f "$STATE_FILE" ] && fails="$(cat "$STATE_FILE" 2>/dev/null || echo 0)"
case "$fails" in ''|*[!0-9]*) fails=0 ;; esac

code="$(curl -s -o /dev/null -m 10 -w '%{http_code}' "$URL" || echo 000)"

if [ "$code" = "200" ]; then
  if [ "$fails" -ge "$MAX_FAILS" ]; then
    notify "✅ Lamsa: الخدمة رجعت تعمل على $URL"
  fi
  echo 0 > "$STATE_FILE"
  exit 0
fi

fails=$((fails + 1))
echo "$fails" > "$STATE_FILE"
log "FAIL #$fails http_code=$code url=$URL"

if [ "$fails" -eq "$MAX_FAILS" ]; then
  notify "🚨 Lamsa: الخدمة متوقفة على $URL (HTTP $code) بعد $fails محاولات"
  if [ "$AUTO_RESTART" = "1" ] && command -v pm2 > /dev/null 2>&1; then
    pm2 restart "$PM2_APP" >> "$LOG_FILE" 2>&1 && notify "🔁 تم تنفيذ pm2 restart $PM2_APP"
  fi
fi

exit 1

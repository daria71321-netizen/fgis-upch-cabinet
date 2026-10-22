/** Дизайн-система «Континуум», серая редакция для кабинета сотрудника. Описание: DESIGN.md */
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#EFEFF1',
        surface: '#FFFFFF',
        ink: '#222125',
        muted: '#5E5C63',
        line: '#E5E4E8',
        line2: '#CBCAD0',
        side: { DEFAULT: '#E3E3E7', ink: '#47464C', act: '#3B3A40' },
        accent: { DEFAULT: '#3B3A40', hover: '#222125', soft: '#E9E9ED', ink: '#2A292E' },
        good: { DEFAULT: '#2B7A50', soft: '#E6F2EB' },
        bad: { DEFAULT: '#B3261E', soft: '#FBEAE8' },
        warn: { DEFAULT: '#9A5B00', soft: '#FFF3DC' },
        info: { DEFAULT: '#3E5A7E', soft: '#EAF0F7' },
      },
      fontFamily: {
        sans: ['Manrope', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        display: ['Unbounded', 'Manrope', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        xs: ['13px', '18px'], sm: ['14px', '20px'], base: ['15px', '22px'], md: ['16px', '24px'],
        lg: ['18px', '26px'], xl: ['22px', '28px'], '2xl': ['26px', '32px'], '3xl': ['32px', '38px'],
      },
      borderRadius: { DEFAULT: '12px', md: '12px', lg: '22px', xl: '28px' },
      boxShadow: { card: '0 1px 2px rgba(20,20,30,.04), 0 8px 28px -12px rgba(30,30,45,.14)', pop: '0 18px 48px -12px rgba(20,20,30,.3)' },
    },
  },
  plugins: [],
}

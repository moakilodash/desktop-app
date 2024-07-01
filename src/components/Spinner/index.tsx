interface Props {
  size: number
}

export const Spinner = (props: Props) => (
  <svg
    aria-hidden="true"
    className={
      'w-' + props.size + ' h-' + props.size + ' text-gray-200 animate-spin'
    }
    fill="none"
    viewBox="0 0 100 100"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M0 50C0 22.3858 22.3858 0 50 0" stroke="#8FD5EA" />
  </svg>
)

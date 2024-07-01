interface Props {
  color: string
}

export const SparkIcon = (props: Props) => (
  <svg fill="none" height={21} width={12} xmlns="http://www.w3.org/2000/svg">
    <path
      d="M5 13.7a.2.2 0 0 0-.2-.2H.324a.2.2 0 0 1-.18-.29L6.622.259C6.715.069 7 .136 7 .348V7.3c0 .11.09.2.2.2h4.476a.2.2 0 0 1 .18.29L5.378 20.741c-.094.189-.379.122-.379-.09V13.7Z"
      fill={props.color}
    />
  </svg>
)
